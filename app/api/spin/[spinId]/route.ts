import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ spinId: string }> }
) {
  const { spinId } = await params;

  const spin = await prisma.spin.findUnique({
    where: { id: spinId },
    include: {
      prize: {
        select: {
          id: true,
          label: true,
          description: true,
          emoji: true,
          imageUrl: true,
        },
      },
      restaurant: {
        select: { name: true, timezone: true },
      },
    },
  });

  if (!spin) {
    return NextResponse.json({ error: "Spin not found" }, { status: 404 });
  }

  return NextResponse.json({
    spinId: spin.id,
    outcome: spin.prizeId ? "win" : "noop",
    spunAt: spin.spunAt.toISOString(),
    prize: spin.prize ?? null,
    claimTokenShort: spin.claimTokenShort,
    claimToken: spin.claimToken,
    restaurantName: spin.restaurant.name,
    timezone: spin.restaurant.timezone,
  });
}
