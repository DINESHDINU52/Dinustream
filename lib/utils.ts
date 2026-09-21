import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names, with later Tailwind utilities winning. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a minute count as `1h 23m` (or `23m` under an hour).
 *
 * Input is normalised first: playback progress is tracked in fractional
 * minutes, so an unrounded value produced strings like `1h 23.4000000001m`,
 * and a missing duration produced `NaNh NaNm`.
 */
export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0m';

  const total = Math.round(minutes);
  const hrs = Math.floor(total / 60);
  const mins = total % 60;

  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

/** Clamped 0–100 percentage, safe against zero/invalid totals. */
export function calculatePercentage(part: number, total: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  const pct = Math.round((part / total) * 100);
  return Math.min(100, Math.max(0, pct));
}
