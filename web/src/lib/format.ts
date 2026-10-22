import type { ConnectionStatus, EventType } from "../types/match";

const pad = (value: number) => String(value).padStart(2, "0");

export const formatClock = (minute: number, second: number) => `${pad(minute)}:${pad(second)}`;

export const formatClockSeconds = (seconds: number) =>
  formatClock(Math.floor(seconds / 60), seconds % 60);

/** Percentage rounded to a whole number, or null when there is nothing to divide. */
export const percent = (part: number, whole: number) =>
  whole === 0 ? null : Math.round((part / whole) * 100);

/** Elapsed match time between two clocks, phrased for a feed. */
export function matchTimeAgo(now: number, then: number) {
  const elapsed = Math.max(0, now - then);
  if (elapsed < 60) return "Just now";
  return `${Math.floor(elapsed / 60)} min ago`;
}

export const EVENT_LABELS: Record<EventType, string> = {
  pass: "Pass",
  shot: "Shot",
  tackle: "Tackle",
  pressure: "Pressure",
};

export const STATUS_TEXT: Record<ConnectionStatus, string> = {
  connecting: "Connecting",
  live: "Live",
  stalled: "No data",
  reconnecting: "Reconnecting",
  offline: "Offline",
};
