import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

type EventRow = { eventType: string; prizeId: string | null; createdAt: Date };
type PrizeRow = { id: string; label: string; emoji: string | null };
type SpinRow = { spunAt: Date; claimedAt: Date | null };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: restaurantId } = await params;

  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const periodParam = req.nextUrl.searchParams.get("period") ?? "7d";
  const days = periodParam === "30d" ? 30 : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Fetch all analytics events in range
  const events: EventRow[] = await prisma.analyticsEvent.findMany({
    where: { restaurantId, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { eventType: true, prizeId: true, createdAt: true },
  });

  // Summary counts
  const summary = {
    landingViews: events.filter((e) => e.eventType === "landing_view").length,
    reviewClicks: events.filter((e) => e.eventType === "review_click").length,
    spinAttempts: events.filter((e) => e.eventType === "spin_attempt").length,
    wins: events.filter((e) => e.eventType === "win").length,
    claims: events.filter((e) => e.eventType === "claim_completed").length,
    capHits: events.filter((e) => e.eventType === "daily_cap_hit").length,
  };

  const rates = {
    winRate:
      summary.spinAttempts > 0
        ? Math.round((summary.wins / summary.spinAttempts) * 100)
        : 0,
    claimRate:
      summary.wins > 0
        ? Math.round((summary.claims / summary.wins) * 100)
        : 0,
    reviewClickRate:
      summary.landingViews > 0
        ? Math.round((summary.reviewClicks / summary.landingViews) * 100)
        : 0,
  };

  // Daily time series
  const dayMap = new Map<
    string,
    { date: string; wins: number; spins: number; claims: number }
  >();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { date: key, wins: 0, spins: 0, claims: 0 });
  }

  for (const event of events) {
    const key = event.createdAt.toISOString().slice(0, 10);
    const day = dayMap.get(key);
    if (!day) continue;
    if (event.eventType === "win") day.wins++;
    if (event.eventType === "spin_attempt") day.spins++;
    if (event.eventType === "claim_completed") day.claims++;
  }

  const timeSeries = Array.from(dayMap.values());

  // Prize breakdown
  const prizes: PrizeRow[] = await prisma.prize.findMany({
    where: { restaurantId },
    select: { id: true, label: true, emoji: true },
  });

  const prizeBreakdown = prizes.map((p) => {
    const prizeWins = events.filter(
      (e) => e.eventType === "win" && e.prizeId === p.id
    );
    const prizeClaims = events.filter(
      (e) => e.eventType === "claim_completed" && e.prizeId === p.id
    );
    return {
      prizeId: p.id,
      label: p.label,
      emoji: p.emoji,
      wins: prizeWins.length,
      claims: prizeClaims.length,
    };
  });

  // Average time to claim (in minutes)
  const claimedSpins: SpinRow[] = await prisma.spin.findMany({
    where: { restaurantId, claimedAt: { not: null }, spunAt: { gte: since } },
    select: { spunAt: true, claimedAt: true },
  });

  const avgMinutesToClaim =
    claimedSpins.length > 0
      ? Math.round(
          claimedSpins.reduce((sum: number, s: SpinRow) => {
            const diff =
              (s.claimedAt!.getTime() - s.spunAt.getTime()) / (1000 * 60);
            return sum + diff;
          }, 0) / claimedSpins.length
        )
      : null;

  return NextResponse.json({
    summary,
    rates,
    timeSeries,
    prizeBreakdown,
    avgMinutesToClaim,
  });
}
