import { z } from 'zod';

export const DEFAULT_TZ = 'Asia/Manila';
export const DEFAULT_TZ_OFFSET = '+08:00';

/** Today's date as YYYY-MM-DD in Asia/Manila, regardless of server TZ. */
export function todayInManila(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: DEFAULT_TZ });
}

/** Format a Date as YYYY-MM-DD */
function fmtIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Returns the Sunday and Saturday of the week containing a given YYYY-MM-DD date.
 * Weeks run Sunday–Saturday.
 */
function sundaySaturdayOf(yyyymmdd: string): { start: string; end: string } {
  const d = new Date(yyyymmdd + 'T00:00:00');
  const sun = new Date(d);
  sun.setDate(d.getDate() - d.getDay());
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  return { start: fmtIso(sun), end: fmtIso(sat) };
}

/**
 * Returns a system-prompt snippet describing the current Sun–Sat week boundaries
 * for "this week", "last week", and "next week", computed in Asia/Manila time.
 */
export function weekContext(): string {
  const todayStr = todayInManila();
  const today = new Date(todayStr + 'T00:00:00');

  const lastSun = new Date(today);
  lastSun.setDate(today.getDate() - 7);
  const nextSun = new Date(today);
  nextSun.setDate(today.getDate() + 7);

  const thisWeek = sundaySaturdayOf(todayStr);
  const lastWeek = sundaySaturdayOf(fmtIso(lastSun));
  const nextWeek = sundaySaturdayOf(fmtIso(nextSun));

  return `
Week boundaries (weeks always run Sunday–Saturday):
- "this week"  → ${thisWeek.start} to ${thisWeek.end}
- "last week"  → ${lastWeek.start} to ${lastWeek.end}
- "next week"  → ${nextWeek.start} to ${nextWeek.end}
When the user says "this week", "last week", or "next week", use those exact date ranges.
When the user names any other specific day or period, compute the Sunday–Saturday week that contains it and use that as the range.`.trim();
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
