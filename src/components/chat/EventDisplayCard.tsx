"use client";

import {
  CalendarTimeGrid,
  CalendarTimeGridBody,
  CalendarTimeGridDay,
  CalendarTimeGridDayHeader,
  CalendarTimeGridDayHeaderDate,
  CalendarTimeGridDayHeaderWeekDay,
  CalendarTimeGridTable,
  CalendarTimeGridTableItem,
  CalendarTimeGridTimeLabels,
} from "@zelkim/zui";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip timezone offset / Z so the string is a "local" ISO datetime */
function stripTz(dt: string): string {
  return dt.replace(/(Z|[+-]\d{2}:\d{2})$/, "");
}

/** Extract "HH:MM" from a datetime string */
function toHHMM(dt: string): string {
  return stripTz(dt).split("T")[1]?.slice(0, 5) ?? "08:00";
}

/** Return "HH:MM" one hour before the given "HH:MM", floored at "00:00" */
function oneHourBefore(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.max(0, h * 60 + m - 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

interface DisplayEvent {
  id?: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

/** Format a Date as "YYYY-MM-DD" */
function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Fill every day between the earliest and latest date in the sorted array.
 * When the range spans 3+ days, expand to full week boundaries (Sun–Sat).
 */
function fillDayRange(sortedDates: string[]): string[] {
  if (sortedDates.length <= 1) return sortedDates;

  let min = new Date(sortedDates[0] + "T00:00:00");
  let max = new Date(sortedDates[sortedDates.length - 1] + "T00:00:00");

  const span = Math.round((max.getTime() - min.getTime()) / 86_400_000) + 1;
  if (span >= 3) {
    // Expand to Sunday–Saturday
    min.setDate(min.getDate() - min.getDay());
    const maxDay = max.getDay();
    if (maxDay !== 6) max.setDate(max.getDate() + (6 - maxDay));
  }

  const result: string[] = [];
  const cursor = new Date(min);
  while (cursor <= max) {
    result.push(fmtDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

/**
 * Compute sorted list of ISO day strings to display.
 * Handles both timed events (dateTime) and all-day events (date).
 * Fills the full date range and expands to week boundaries when 3+ days.
 */
function computeDays(events: DisplayEvent[]): string[] {
  const dateSet = new Set<string>();

  for (const evt of events) {
    const dt = evt.start.dateTime ?? evt.start.date;
    if (!dt) continue;
    const localDt = stripTz(dt);
    const dateStr = localDt.slice(0, 10);
    dateSet.add(dateStr);
  }

  const sortedDates = Array.from(dateSet).sort();
  return fillDayRange(sortedDates).map((d) => `${d}T00:00:00`);
}

/** Return all timed events whose start date matches the given "YYYY-MM-DD" day */
function timedEventsOnDay(events: DisplayEvent[], dayDate: string): DisplayEvent[] {
  return events.filter((evt) => {
    if (!evt.start.dateTime) return false;
    return stripTz(evt.start.dateTime).slice(0, 10) === dayDate;
  });
}

/** Return all all-day events on a given date */
function allDayEventsOnDay(events: DisplayEvent[], dayDate: string): DisplayEvent[] {
  return events.filter((evt) => {
    if (evt.start.dateTime) return false; // skip timed events
    const startDate = evt.start.date;
    if (!startDate) return false;
    return startDate === dayDate;
  });
}

// ── Color palette for multiple events ─────────────────────────────────────────

const EVENT_COLORS = [
  "bg-blue-100 border-blue-300 text-blue-900",
  "bg-emerald-100 border-emerald-300 text-emerald-900",
  "bg-violet-100 border-violet-300 text-violet-900",
  "bg-amber-100 border-amber-300 text-amber-900",
  "bg-rose-100 border-rose-300 text-rose-900",
  "bg-cyan-100 border-cyan-300 text-cyan-900",
];

function eventColor(index: number): string {
  return EVENT_COLORS[index % EVENT_COLORS.length];
}

// ── Main Component ────────────────────────────────────────────────────────────

interface EventDisplayCardProps {
  /** Title shown in the card header */
  title?: string;
  /** Subtitle / description in the header */
  subtitle?: string;
  /** Array of Google Calendar event objects (from list_events or create_events result) */
  events: DisplayEvent[];
}

/**
 * Read-only timegrid card to display calendar events.
 * Used after list_events (CHAT route) and after create_events completes.
 */
export function EventDisplayCard({
  title,
  subtitle,
  events,
}: EventDisplayCardProps) {
  if (!events.length) return null;

  // Separate timed vs all-day
  const timedEvents = events.filter((e) => !!e.start.dateTime);
  const allDayEvents = events.filter((e) => !e.start.dateTime && !!e.start.date);

  const days = computeDays(events).slice(0, 7);

  // Compute scroll time from earliest timed event
  const firstDt = timedEvents
    .map((e) => e.start.dateTime!)
    .filter(Boolean)
    .sort()[0];
  const scrollTime = firstDt ? toHHMM(firstDt) : "08:00";

  const hasTimed = timedEvents.length > 0;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden text-sm w-full max-w-2xl">
      {/* Header */}
      {(title || subtitle) && (
        <div className="px-4 py-3 border-b bg-muted/40">
          {title && <p className="font-medium">{title}</p>}
          {subtitle && (
            <p className="text-muted-foreground text-xs mt-0.5">{subtitle}</p>
          )}
        </div>
      )}

      {/* All-day events banner */}
      {allDayEvents.length > 0 && (
        <div className="px-4 py-2 border-b bg-muted/20 space-y-1">
          {allDayEvents.map((evt, i) => (
            <div
              key={evt.id ?? `allday-${i}`}
              className="text-xs flex items-center gap-2"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
              <span className="font-medium">{evt.summary}</span>
              <span className="text-muted-foreground">All day</span>
            </div>
          ))}
        </div>
      )}

      {/* Timegrid */}
      {hasTimed && (
        <div className="p-3">
          <CalendarTimeGrid format="12">
            <CalendarTimeGridBody
              initialScrollTime={oneHourBefore(scrollTime)}
              className="max-h-[400px]"
              draggable
            >
              <CalendarTimeGridTimeLabels className="w-16" />
              {days.map((dayIso) => {
                const dayDate = dayIso.slice(0, 10);
                const dayEvents = timedEventsOnDay(timedEvents, dayDate);
                return (
                  <CalendarTimeGridDay key={dayIso} day={dayIso}>
                    <CalendarTimeGridDayHeader>
                      <CalendarTimeGridDayHeaderWeekDay />
                      <CalendarTimeGridDayHeaderDate />
                    </CalendarTimeGridDayHeader>
                    <CalendarTimeGridTable resolveOverlaps>
                      {dayEvents.map((evt, i) => (
                        <CalendarTimeGridTableItem
                          key={evt.id ?? `${dayDate}-${i}`}
                          id={evt.id ?? `${dayDate}-${i}`}
                          start={stripTz(evt.start.dateTime!)}
                          end={stripTz(evt.end.dateTime!)}
                          color={eventColor(i)}
                        >
                          {evt.summary}
                        </CalendarTimeGridTableItem>
                      ))}
                    </CalendarTimeGridTable>
                  </CalendarTimeGridDay>
                );
              })}
            </CalendarTimeGridBody>
          </CalendarTimeGrid>
        </div>
      )}

      {/* Fallback: only all-day events, no timed grid needed — already rendered above */}
      {!hasTimed && allDayEvents.length === 0 && (
        <div className="px-4 py-3 text-muted-foreground text-xs">
          No events to display.
        </div>
      )}
    </div>
  );
}
