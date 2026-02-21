import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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

  const existing = await prisma.prize.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Prize not found" }, { status: 404 });
  }

  // Enforce single fallback per restaurant
  if (body.isFallback && !existing.isFallback) {
    const existingFallback = await prisma.prize.findFirst({
      where: { restaurantId: existing.restaurantId, isFallback: true, id: { not: id } },
    });
    if (existingFallback) {
      return NextResponse.json(
        { error: "A fallback prize already exists for this restaurant." },
        { status: 409 }
      );
    }
  }

  const prize = await prisma.prize.update({
    where: { id },
    data: {
      ...(body.label !== undefined && { label: body.label }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
      ...(body.emoji !== undefined && { emoji: body.emoji }),
      ...(body.weight !== undefined && { weight: body.weight }),
      ...(body.dailyCap !== undefined && { dailyCap: body.dailyCap }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.isFallback !== undefined && { isFallback: body.isFallback }),
    },
  });

  return NextResponse.json(prize);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.prize.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
