import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { prizes: true, spins: true } } },
  });

  return NextResponse.json(restaurants);
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    name?: string;
    slug?: string;
    logoUrl?: string;
    googleUrl?: string;
    timezone?: string;
    dailyWinCap?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name || !body.slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(body.slug)) {
    return NextResponse.json(
      { error: "Slug must be lowercase letters, numbers, and hyphens only" },
      { status: 400 }
    );
  }

  const existing = await prisma.restaurant.findUnique({ where: { slug: body.slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  const restaurant = await prisma.restaurant.create({
    data: {
      name: body.name,
      slug: body.slug,
      logoUrl: body.logoUrl || null,
      googleUrl: body.googleUrl || null,
      timezone: body.timezone || "Europe/Zurich",
      dailyWinCap: body.dailyWinCap ?? null,
    },
  });

  return NextResponse.json(restaurant, { status: 201 });
}
