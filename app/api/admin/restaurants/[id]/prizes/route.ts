import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const prizes = await prisma.prize.findMany({
    where: { restaurantId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(prizes);
}

export async function POST(
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
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  let body: {
    label?: string;
    description?: string | null;
    imageUrl?: string | null;
    emoji?: string | null;
    weight?: number;
    dailyCap?: number | null;
    active?: boolean;
    isFallback?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.label) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }

  if (body.weight !== undefined && body.weight < 1) {
    return NextResponse.json({ error: "weight must be >= 1" }, { status: 400 });
  }

  // Enforce single fallback per restaurant
  if (body.isFallback) {
    const existingFallback = await prisma.prize.findFirst({
      where: { restaurantId, isFallback: true },
    });
    if (existingFallback) {
      return NextResponse.json(
        { error: "A fallback prize already exists for this restaurant. Remove or update it first." },
        { status: 409 }
      );
    }
  }

  const prize = await prisma.prize.create({
    data: {
      restaurantId,
      label: body.label,
      description: body.description ?? null,
      imageUrl: body.imageUrl ?? null,
      emoji: body.emoji ?? null,
      weight: body.weight ?? 1,
      dailyCap: body.dailyCap ?? null,
      active: body.active ?? true,
      isFallback: body.isFallback ?? false,
    },
  });

  return NextResponse.json(prize, { status: 201 });
}
