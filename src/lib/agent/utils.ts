import { z } from 'zod';

export const DEFAULT_TZ = 'Asia/Manila';
export const DEFAULT_TZ_OFFSET = '+08:00';

/** Today's date as YYYY-MM-DD in Asia/Manila, regardless of server TZ. */
export function todayInManila(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: DEFAULT_TZ });
}

/** RFC3339 with mandatory timezone — used on create_events strict schema. */
export const datetimeWithTz = z
  .string()
  .refine(
    (v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(v),
    { message: 'Must be RFC3339 format with timezone, e.g. 2026-04-14T09:00:00+08:00' },
  );

/**
 * Try to produce a valid RFC3339 string.
 * Accepts strings with or without timezone offset.
 * If no timezone is present, appends DEFAULT_TZ_OFFSET (Asia/Manila, +08:00).
 * Returns null if the value cannot be parsed as a date at all.
 */
export function normalizeToRfc3339(value: string): string | null {
  // Already valid RFC3339 with tz
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return value;
  }
  // Has seconds but no tz — append offset
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) {
    return value + DEFAULT_TZ_OFFSET;
  }
  // Has HH:MM but no seconds — append :00 + offset
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return value + ':00' + DEFAULT_TZ_OFFSET;
  }
  // Fallback: try native Date parsing
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    return d.toISOString().replace('Z', DEFAULT_TZ_OFFSET);
  }
  return null;
}
