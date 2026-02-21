import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recordEventSilent } from "@/lib/analytics";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const spin = await prisma.spin.findUnique({
    where: { claimToken: token },
    include: {
      prize: {
        select: { label: true, description: true, emoji: true, imageUrl: true },
      },
      restaurant: {
        select: { name: true, timezone: true },
      },
    },
  });

  if (!spin || !spin.prize) {
    return NextResponse.json({ error: "Invalid claim token" }, { status: 404 });
  }

  return NextResponse.json({
    restaurantName: spin.restaurant.name,
    timezone: spin.restaurant.timezone,
    prize: spin.prize,
    wonAt: spin.spunAt.toISOString(),
    claimedAt: spin.claimedAt?.toISOString() ?? null,
    status: spin.claimedAt ? "redeemed" : "pending",
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Atomic claim: only writes if not already claimed
  const updated = await prisma.spin.updateMany({
    where: { claimToken: token, claimedAt: null },
    data: { claimedAt: new Date() },
  });

  // Fetch current state regardless of whether we just claimed or it was already claimed
  const spin = await prisma.spin.findUnique({
    where: { claimToken: token },
    select: {
      id: true,
      claimedAt: true,
      restaurantId: true,
      prizeId: true,
    },
  });

  if (!spin) {
    return NextResponse.json({ error: "Invalid claim token" }, { status: 404 });
  }

  if (updated.count > 0) {
    // Fresh claim
    recordEventSilent(spin.restaurantId, "claim_completed", {
      prizeId: spin.prizeId ?? undefined,
      spinId: spin.id,
    });
  }

  return NextResponse.json({
    claimedAt: spin.claimedAt?.toISOString() ?? null,
    alreadyClaimed: updated.count === 0,
  });
}
