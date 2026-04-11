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
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

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

const BYDAY_TO_DOW: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

interface CalEvent {
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
  recurrence?: string[];
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
 * Compute the sorted list of ISO day strings (e.g. "2025-07-14T00:00:00") to
 * display. Handles BYDAY recurrence by expanding to sibling days in the same
 * week as the first event, then fills the full date range.
 */
function computeDays(events: CalEvent[]): string[] {
  const dateSet = new Set<string>();

  for (const evt of events) {
    const localDt = stripTz(evt.start.dateTime);
    const dateStr = localDt.slice(0, 10);
    dateSet.add(dateStr);

    if (evt.recurrence) {
      for (const rule of evt.recurrence) {
        const match = rule.match(/BYDAY=([A-Z,]+)/);
        if (!match) continue;

        const codes = match[1].split(",");
        const firstDate = new Date(localDt);

        // Get the Sunday of the week containing firstDate
        const sunday = new Date(firstDate);
        sunday.setDate(sunday.getDate() - sunday.getDay());

        for (const code of codes) {
          const dow = BYDAY_TO_DOW[code];
          if (dow === undefined) continue;
          const d = new Date(sunday);
          d.setDate(sunday.getDate() + dow);
          dateSet.add(fmtDate(d));
        }
      }
    }
  }

  const sortedDates = Array.from(dateSet).sort();
  return fillDayRange(sortedDates).map((d) => `${d}T00:00:00`);
}

/** Return all events whose start date matches the given "YYYY-MM-DD" day */
function eventsOnDay(events: CalEvent[], dayDate: string): CalEvent[] {
  return events.filter(
    (evt) => stripTz(evt.start.dateTime).slice(0, 10) === dayDate
  );
}

// ── Time Grid ─────────────────────────────────────────────────────────────────

function TimeGrid({
  events,
  scrollTime,
}: {
  events: CalEvent[];
  scrollTime: string;
}) {
  const days = computeDays(events);

  return (
    <CalendarTimeGrid format="12">
      <CalendarTimeGridBody
        initialScrollTime={oneHourBefore(scrollTime)}
        className="max-h-[400px]"
        draggable
      >
        <CalendarTimeGridTimeLabels className="w-16" />
        {days.map((dayIso) => {
          const dayDate = dayIso.slice(0, 10);
          const dayEvents = eventsOnDay(events, dayDate);
          return (
            <CalendarTimeGridDay key={dayIso} day={dayIso}>
              <CalendarTimeGridDayHeader>
                <CalendarTimeGridDayHeaderWeekDay />
                <CalendarTimeGridDayHeaderDate />
              </CalendarTimeGridDayHeader>
              <CalendarTimeGridTable resolveOverlaps>
                {dayEvents.map((evt, i) => (
                  <CalendarTimeGridTableItem
                    key={`${dayDate}-${i}`}
                    id={`${dayDate}-${i}`}
                    start={stripTz(evt.start.dateTime)}
                    end={stripTz(evt.end.dateTime)}
                    color="bg-blue-100 border-blue-300 text-blue-900"
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
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface EventApprovalCardProps {
  toolName: string;
  toolInput: any;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EventApprovalCard({
  toolName,
  toolInput,
  onConfirm,
  onCancel,
}: EventApprovalCardProps) {
  // ── create_events ───────────────────────────────────────────────────────────
  if (toolName === "create_events") {
    // Tool schema uses flat startDatetime/endDatetime — normalise to CalEvent shape
    const events: CalEvent[] = (toolInput?.events ?? []).map((e: any) => ({
      summary: e.summary ?? "Event",
      start: { dateTime: e.startDatetime ?? e.start?.dateTime ?? "" },
      end: { dateTime: e.endDatetime ?? e.end?.dateTime ?? "" },
      recurrence: e.recurrence,
    }));
    const hasDateTimes = events.some((e) => !!e.start.dateTime);

    const firstDt = events
      .map((e) => e.start.dateTime)
      .filter(Boolean)
      .sort()[0];
    const scrollTime = firstDt ? toHHMM(firstDt) : "08:00";

    return (
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden text-sm w-full max-w-2xl">
        <div className="px-4 py-3 border-b bg-muted/40">
          <p className="font-medium">
            Create {events.length === 1 ? "event" : `${events.length} events`}
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">
            Review the time{events.length === 1 ? "" : "s"} below, then
            confirm.
          </p>
        </div>

        {hasDateTimes ? (
          <div className="p-3">
            <TimeGrid events={events} scrollTime={scrollTime} />
          </div>
        ) : (
          <div className="px-4 py-3 space-y-1">
            {events.map((evt, i) => (
              <p key={i} className="text-muted-foreground">
                • {evt.summary}
              </p>
            ))}
          </div>
        )}

        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="w-3 h-3 mr-1" /> Cancel
          </Button>
          <Button size="sm" onClick={onConfirm}>
            <Check className="w-3 h-3 mr-1" /> Confirm
          </Button>
        </div>
      </div>
    );
  }

  // ── edit_event ──────────────────────────────────────────────────────────────
  if (toolName === "edit_event") {
    // Use new start/end if provided, fall back to current event times
    const newStart = toolInput?.startDatetime;
    const newEnd = toolInput?.endDatetime;
    const displayStart = newStart ?? toolInput?.currentStartDatetime;
    const displayEnd = newEnd ?? toolInput?.currentEndDatetime;
    const displaySummary =
      toolInput?.summary ?? toolInput?.currentSummary ?? "Event";
    const hasDateTimes = !!(displayStart && displayEnd);
    const isTimeChange = !!(newStart || newEnd);

    const syntheticEvent: CalEvent | null = hasDateTimes
      ? {
          summary: displaySummary,
          start: { dateTime: displayStart! },
          end: { dateTime: displayEnd! },
        }
      : null;

    const scrollTime = syntheticEvent
      ? toHHMM(syntheticEvent.start.dateTime)
      : "08:00";

    return (
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden text-sm w-full max-w-2xl">
        <div className="px-4 py-3 border-b bg-muted/40">
          <p className="font-medium">Edit event</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            {isTimeChange ? "New time shown below." : "Current time shown below."}
          </p>
        </div>

        {syntheticEvent ? (
          <div className="p-3">
            <TimeGrid events={[syntheticEvent]} scrollTime={scrollTime} />
          </div>
        ) : (
          <div className="px-4 py-3 text-muted-foreground text-xs">
            {Object.entries(toolInput ?? {})
              .filter(([k]) => !["calendarId", "eventId", "currentStartDatetime", "currentEndDatetime", "currentSummary"].includes(k))
              .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
              .join(", ")}
          </div>
        )}

        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="w-3 h-3 mr-1" /> Cancel
          </Button>
          <Button size="sm" onClick={onConfirm}>
            <Check className="w-3 h-3 mr-1" /> Confirm
          </Button>
        </div>
      </div>
    );
  }

  // ── delete_event ────────────────────────────────────────────────────────────
  const hasDeleteTimes = !!(toolInput?.startDateTime && toolInput?.endDateTime);
  const deleteEvent: CalEvent | null = hasDeleteTimes
    ? {
        summary: toolInput.summary ?? "Event",
        start: { dateTime: toolInput.startDateTime },
        end: { dateTime: toolInput.endDateTime },
      }
    : null;
  const deleteScrollTime = deleteEvent
    ? toHHMM(deleteEvent.start.dateTime)
    : "08:00";

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden text-sm w-full max-w-2xl">
      <div className="px-4 py-3 border-b bg-muted/40">
        <p className="font-medium text-destructive">Delete event</p>
        {toolInput?.summary && (
          <p className="text-muted-foreground text-xs mt-0.5">
            &quot;{toolInput.summary}&quot;
          </p>
        )}
      </div>

      {deleteEvent ? (
        <div className="p-3">
          <TimeGrid events={[deleteEvent]} scrollTime={deleteScrollTime} />
        </div>
      ) : (
        <div className="px-4 py-3 text-muted-foreground text-xs">
          This action cannot be undone.
        </div>
      )}

      <div className="px-4 py-3 border-t flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" /> Cancel
        </Button>
        <Button size="sm" variant="destructive" onClick={onConfirm}>
          <Check className="w-3 h-3 mr-1" /> Delete
        </Button>
      </div>
    </div>
  );
}
