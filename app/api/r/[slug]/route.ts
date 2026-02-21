import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, active: true },
    include: {
      prizes: {
        where: { active: true },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          label: true,
          description: true,
          emoji: true,
          imageUrl: true,
          isFallback: true,
          // weight intentionally excluded from client response
        },
      },
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    logoUrl: restaurant.logoUrl,
    googleUrl: restaurant.googleUrl,
    timezone: restaurant.timezone,
    prizes: restaurant.prizes,
  });
}
