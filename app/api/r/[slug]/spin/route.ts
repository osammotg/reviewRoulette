import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashFingerprint, hashIp, shortToken } from "@/lib/hash";
import { decideSpin, getLocalDateString } from "@/lib/spin-engine";
import { recordEventSilent } from "@/lib/analytics";
import { v4 as uuidv4 } from "uuid";
// Use string literal for isolation level — Prisma v7 $transaction accepts it
const SERIALIZABLE = "Serializable" as const;

type PrizeRow = {
  id: string; label: string; weight: number; dailyCap: number | null;
  isFallback: boolean; active: boolean;
};
type CounterRow = { prizeId: string; claims: number };
type DailyCounterRow = { totalWins: number } | null;

function getRealIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // --- 1. Resolve restaurant ---
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, active: true },
    include: {
      prizes: {
        where: { active: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  // --- 2. Parse body ---
  let body: { fingerprintToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fp = body.fingerprintToken ?? "unknown";
  const ip = getRealIp(req);
  const deviceHash = hashFingerprint(fp);
  const ipHash = hashIp(ip);

  // --- 3. Rate limiting (24-hour window) ---
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [deviceSpinCount, ipSpinCount] = await Promise.all([
    prisma.spin.count({
      where: { restaurantId: restaurant.id, deviceHash, spunAt: { gte: since } },
    }),
    prisma.spin.count({
      where: { restaurantId: restaurant.id, ipHash, spunAt: { gte: since } },
    }),
  ]);

  if (deviceSpinCount > 0) {
    const lastSpin = await prisma.spin.findFirst({
      where: { restaurantId: restaurant.id, deviceHash },
      orderBy: { spunAt: "desc" },
      select: { spunAt: true },
    });
    const nextEligibleAt = lastSpin
      ? new Date(lastSpin.spunAt.getTime() + 24 * 60 * 60 * 1000).toISOString()
      : null;
    return NextResponse.json(
      { error: "Rate limited", reason: "already_spun", nextEligibleAt },
      { status: 429 }
    );
  }

  if (ipSpinCount >= 3) {
    return NextResponse.json(
      { error: "Rate limited", reason: "ip_limit" },
      { status: 429 }
    );
  }

  // --- 4. Record spin_attempt analytics (fire-and-forget) ---
  recordEventSilent(restaurant.id, "spin_attempt");

  // --- 5. Determine outcome inside a serializable transaction ---
  const today = getLocalDateString(restaurant.timezone);
  const activePrizes: PrizeRow[] = restaurant.prizes.filter((p: PrizeRow) => !p.isFallback);
  const fallbackPrize: PrizeRow | null = restaurant.prizes.find((p: PrizeRow) => p.isFallback) ?? null;

  const spinId = uuidv4();

  try {
    const result = await prisma.$transaction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (tx: any) => {
        // Fetch today's counters for all active prizes
        const prizeCounters: CounterRow[] = await tx.prizeDailyCounter.findMany({
          where: { prizeId: { in: activePrizes.map((p: PrizeRow) => p.id) }, date: today },
          select: { prizeId: true, claims: true },
        });
        const counterMap = new Map(prizeCounters.map((c: CounterRow) => [c.prizeId, c.claims]));

        // Fetch today's restaurant-level win count
        const restaurantCounter: DailyCounterRow = await tx.restaurantDailyCounter.findUnique({
          where: { restaurantId_date: { restaurantId: restaurant.id, date: today } },
          select: { totalWins: true },
        });
        const restaurantDailyWins = restaurantCounter?.totalWins ?? 0;

        // Fetch fallback counter if exists
        let fallbackCount = 0;
        if (fallbackPrize) {
          const fc = await tx.prizeDailyCounter.findUnique({
            where: { prizeId_date: { prizeId: fallbackPrize.id, date: today } },
          });
          fallbackCount = fc?.claims ?? 0;
        }

        const prizeOptions = activePrizes.map((p: PrizeRow) => ({
          id: p.id,
          label: p.label,
          weight: p.weight,
          dailyCap: p.dailyCap,
          isFallback: false,
          currentDailyCount: counterMap.get(p.id) ?? 0,
        }));

        const fallbackOption = fallbackPrize
          ? {
              id: fallbackPrize.id,
              label: fallbackPrize.label,
              weight: fallbackPrize.weight,
              dailyCap: fallbackPrize.dailyCap,
              isFallback: true,
              currentDailyCount: fallbackCount,
            }
          : null;

        const decision = decideSpin(
          prizeOptions,
          fallbackOption,
          restaurantDailyWins,
          restaurant.dailyWinCap
        );

        let claimToken: string | null = null;
        let claimTokenShort: string | null = null;

        if (decision.outcome === "win") {
          claimToken = uuidv4();
          claimTokenShort = shortToken(claimToken);

          // Atomically increment prize daily counter
          await tx.prizeDailyCounter.upsert({
            where: { prizeId_date: { prizeId: decision.prizeId, date: today } },
            create: { prizeId: decision.prizeId, date: today, claims: 1 },
            update: { claims: { increment: 1 } },
          });

          // Atomically increment restaurant daily counter
          await tx.restaurantDailyCounter.upsert({
            where: { restaurantId_date: { restaurantId: restaurant.id, date: today } },
            create: { restaurantId: restaurant.id, date: today, totalWins: 1 },
            update: { totalWins: { increment: 1 } },
          });
        }

        // Insert spin row
        const spin = await tx.spin.create({
          data: {
            id: spinId,
            restaurantId: restaurant.id,
            deviceHash,
            ipHash,
            prizeId: decision.outcome === "win" ? decision.prizeId : null,
            claimToken,
            claimTokenShort,
          },
          include: { prize: true },
        });

        return { decision, spin, claimToken, claimTokenShort };
      },
      { isolationLevel: SERIALIZABLE }
    );

    // --- 6. Post-transaction analytics ---
    if (result.decision.outcome === "win") {
      recordEventSilent(restaurant.id, "win", {
        prizeId: result.decision.prizeId,
        spinId,
      });
    } else if (
      result.decision.reason === "all_capped" ||
      result.decision.reason === "restaurant_cap"
    ) {
      recordEventSilent(restaurant.id, "daily_cap_hit", { spinId });
    }

    // --- 7. Build response ---
    const prize = result.spin.prize;

    return NextResponse.json({
      spinId,
      outcome: result.decision.outcome,
      segmentIndex: result.decision.segmentIndex,
      ...(result.decision.outcome === "win" && prize
        ? {
            prize: {
              id: prize.id,
              label: prize.label,
              description: prize.description,
              emoji: prize.emoji,
              imageUrl: prize.imageUrl,
            },
            claimToken: result.claimToken,
            claimTokenShort: result.claimTokenShort,
          }
        : {}),
      ...(result.decision.outcome === "noop" &&
      (result.decision.reason === "all_capped" || result.decision.reason === "restaurant_cap")
        ? { capReached: true }
        : {}),
    });
  } catch (error) {
    // Serialization failure under high concurrency — ask client to retry
    if (
      error != null &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2034"
    ) {
      return NextResponse.json({ error: "Please try again" }, { status: 503 });
    }
    console.error("Spin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
