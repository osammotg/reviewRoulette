import { prisma } from "@/lib/db";

export type AnalyticsEventType =
  | "landing_view"
  | "review_click"
  | "spin_attempt"
  | "win"
  | "claim_completed"
  | "daily_cap_hit";

export async function recordEvent(
  restaurantId: string,
  eventType: AnalyticsEventType,
  opts: {
    prizeId?: string;
    spinId?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> {
  await prisma.analyticsEvent.create({
    data: {
      restaurantId,
      eventType,
      prizeId: opts.prizeId,
      spinId: opts.spinId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: (opts.metadata ?? undefined) as any,
    },
  });
}

/** Fire-and-forget analytics recording — never throws */
export function recordEventSilent(
  restaurantId: string,
  eventType: AnalyticsEventType,
  opts: { prizeId?: string; spinId?: string; metadata?: Record<string, unknown> } = {}
): void {
  recordEvent(restaurantId, eventType, opts).catch(() => {});
}
