import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recordEvent, AnalyticsEventType } from "@/lib/analytics";

const ALLOWED_CLIENT_EVENTS: AnalyticsEventType[] = ["landing_view", "review_click"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, active: true },
    select: { id: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { eventType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body.eventType as AnalyticsEventType;
  if (!ALLOWED_CLIENT_EVENTS.includes(eventType)) {
    return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
  }

  await recordEvent(restaurant.id, eventType);

  return new NextResponse(null, { status: 204 });
}
