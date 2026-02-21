/**
 * Pure spin-engine: weighted prize selection with daily cap enforcement.
 * No DB access — takes pre-fetched data, returns a decision.
 */

export interface PrizeOption {
  id: string;
  label: string;
  weight: number;
  dailyCap: number | null;
  isFallback: boolean;
  currentDailyCount: number; // claims today so far
}

export type SpinDecision =
  | { outcome: "win"; prizeId: string; segmentIndex: number }
  | { outcome: "noop"; reason: "no_prizes" | "all_capped" | "restaurant_cap"; segmentIndex: number };

/**
 * Runs weighted random selection respecting per-prize daily caps and the
 * restaurant-level daily win cap.
 *
 * @param prizes        Active, non-fallback prizes ordered consistently (must match wheel segment order)
 * @param fallback      Optional designated fallback prize
 * @param restaurantDailyWins   Wins recorded today for this restaurant
 * @param restaurantDailyCap    Restaurant-level cap (null = unlimited)
 * @returns SpinDecision — segmentIndex is the index into [prizes..., noopSlot] wheel array
 */
export function decideSpin(
  prizes: PrizeOption[],
  fallback: PrizeOption | null,
  restaurantDailyWins: number,
  restaurantDailyCap: number | null
): SpinDecision {
  const noopSegmentIndex = prizes.length; // last segment is always "Better luck next time"

  // Restaurant-level daily cap check
  if (restaurantDailyCap !== null && restaurantDailyWins >= restaurantDailyCap) {
    return { outcome: "noop", reason: "restaurant_cap", segmentIndex: noopSegmentIndex };
  }

  if (prizes.length === 0) {
    return { outcome: "noop", reason: "no_prizes", segmentIndex: noopSegmentIndex };
  }

  // Filter to prizes that still have capacity today
  const available = prizes.filter(
    (p) => p.dailyCap === null || p.currentDailyCount < p.dailyCap
  );

  if (available.length === 0) {
    // All prizes capped — use fallback if available
    if (fallback && (fallback.dailyCap === null || fallback.currentDailyCount < (fallback.dailyCap ?? Infinity))) {
      const fallbackIndex = prizes.findIndex((p) => p.id === fallback.id);
      // Fallback prize is in the prizes array; if not found treat as noop
      if (fallbackIndex !== -1) {
        return { outcome: "win", prizeId: fallback.id, segmentIndex: fallbackIndex };
      }
    }
    return { outcome: "noop", reason: "all_capped", segmentIndex: noopSegmentIndex };
  }

  // Weighted random selection from available prizes
  const totalWeight = available.reduce((sum, p) => sum + p.weight, 0);
  const noop_weight = Math.round(totalWeight * 0.3); // ~23% no-win built-in unless weights already account for it
  const grandTotal = totalWeight + noop_weight;

  const roll = Math.random() * grandTotal;

  if (roll >= totalWeight) {
    // Landed on noop slice
    return { outcome: "noop", reason: "no_prizes", segmentIndex: noopSegmentIndex };
  }

  let cursor = 0;
  for (const prize of available) {
    cursor += prize.weight;
    if (roll < cursor) {
      // Find segment index in the original prizes array (wheel order)
      const segmentIndex = prizes.findIndex((p) => p.id === prize.id);
      return { outcome: "win", prizeId: prize.id, segmentIndex };
    }
  }

  // Fallthrough — should not happen, but return noop safely
  return { outcome: "noop", reason: "no_prizes", segmentIndex: noopSegmentIndex };
}

/** Returns a local date string "YYYY-MM-DD" in the given IANA timezone */
export function getLocalDateString(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
