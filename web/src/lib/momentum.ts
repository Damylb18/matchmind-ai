import type { MatchEvent } from "../types/match";

/**
 * Illustrative event-based momentum estimate.
 *
 * This is NOT possession, xG, field tilt or a tracking-data metric. It is a
 * transparent heuristic over the events the browser has received since it
 * connected to the stream:
 *
 * 1. Every event credits its team with a weight:
 *      completed pass    1.0
 *      incomplete pass   0.25
 *      shot              3.0
 *      tackle            1.5
 *      pressure          2.0 × intensity (0–1, from the feed)
 * 2. Weights are summed per team in 15-second bins of match time.
 * 3. Per bin: momentum = (home − away) / (home + away), from −1 (all away
 *    activity) to +1 (all home activity).
 * 4. The series is smoothed with a centred 3-bin moving average.
 */

export const MOMENTUM_BIN_SECONDS = 15;

export const MOMENTUM_WEIGHTS = {
  completedPass: 1,
  incompletePass: 0.25,
  shot: 3,
  tackle: 1.5,
  pressurePerUnit: 2,
} as const;

export function momentumWeight(event: MatchEvent) {
  switch (event.event_type) {
    case "pass":
      return event.completed ? MOMENTUM_WEIGHTS.completedPass : MOMENTUM_WEIGHTS.incompletePass;
    case "shot":
      return MOMENTUM_WEIGHTS.shot;
    case "tackle":
      return MOMENTUM_WEIGHTS.tackle;
    case "pressure":
      return MOMENTUM_WEIGHTS.pressurePerUnit * (event.pressure ?? 0);
  }
}

/** bin index → team name → summed weight */
export type MomentumBins = Record<number, Record<string, number>>;

export type MomentumPoint = { bin: number; value: number | null };

export function momentumSeries(
  bins: MomentumBins,
  home: string,
  away: string,
  fromBin: number,
  toBin: number,
): MomentumPoint[] {
  const raw: (number | null)[] = [];
  for (let bin = fromBin; bin <= toBin; bin++) {
    const weights = bins[bin];
    const h = weights?.[home] ?? 0;
    const a = weights?.[away] ?? 0;
    raw.push(h + a > 0 ? (h - a) / (h + a) : null);
  }

  return raw.map((value, index) => {
    if (value === null) return { bin: fromBin + index, value: null };
    const window = [raw[index - 1], value, raw[index + 1]].filter(
      (item): item is number => typeof item === "number",
    );
    return {
      bin: fromBin + index,
      value: window.reduce((sum, item) => sum + item, 0) / window.length,
    };
  });
}
