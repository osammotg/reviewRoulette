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
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: {
      prizes: { orderBy: { createdAt: "asc" } },
      _count: { select: { spins: true } },
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(restaurant);
}

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
    name?: string;
    slug?: string;
    logoUrl?: string | null;
    googleUrl?: string | null;
    active?: boolean;
    timezone?: string;
    dailyWinCap?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.slug && !/^[a-z0-9-]+$/.test(body.slug)) {
    return NextResponse.json(
      { error: "Slug must be lowercase letters, numbers, and hyphens only" },
      { status: 400 }
    );
  }

  try {
    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
        ...(body.googleUrl !== undefined && { googleUrl: body.googleUrl }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.timezone !== undefined && { timezone: body.timezone }),
        ...(body.dailyWinCap !== undefined && { dailyWinCap: body.dailyWinCap }),
      },
    });
    return NextResponse.json(restaurant);
  } catch {
    return NextResponse.json({ error: "Not found or slug conflict" }, { status: 404 });
  }
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
    await prisma.restaurant.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
