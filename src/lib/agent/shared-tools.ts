import { tool } from 'ai';
import { z } from 'zod';
import { getCalendarClient, createEvents, editEvent, deleteEvent } from '@/lib/calendar/wrapper';
import { DEFAULT_TZ, datetimeWithTz, normalizeToRfc3339 } from './utils';

/**
 * Returns every tool used by any agent, with real execute implementations.
 *
 * The AI SDK validates ALL tool parts in message history against the current
 * agent's tool schemas. Since conversation history may contain tool calls from
 * a different agent (e.g. the user first listed events via CHAT, then created
 * via CREATE), every agent must register schemas for every tool.
 *
 * Each agent spreads these tools, and its system prompt controls which ones
 * the LLM actually calls.
 */
export function allTools(reqHeaders: Headers) {
  return {
    list_events: tool({
      description: 'List calendar events for a date range or search query.',
      inputSchema: z.object({
        calendarId: z.string().default('primary'),
        timeMin: z.string().optional().describe('RFC3339 start of range, e.g. 2026-04-11T00:00:00+08:00'),
        timeMax: z.string().optional().describe('RFC3339 end of range, e.g. 2026-04-12T00:00:00+08:00'),
        q: z.string().optional().describe('Free-text search query'),
      }),
      execute: async (args) => {
        const calendar = await getCalendarClient(reqHeaders);
        const res = await calendar.events.list({
          calendarId: args.calendarId,
          timeMin: args.timeMin,
          timeMax: args.timeMax,
          q: args.q,
          singleEvents: true,
          orderBy: 'startTime',
        });
        return res.data.items || [];
      },
    }),

    prepare_event_draft: tool({
      description:
        'Validate and collect required fields for a new event. Returns missing fields or a complete events array. MUST be called before create_events.',
      inputSchema: z.object({
        calendarId: z.string().default('primary'),
        summary: z.string().optional(),
        description: z.string().optional(),
        startDatetime: z.string().optional().describe('RFC3339 datetime, e.g. 2026-04-14T09:00:00+08:00'),
        endDatetime: z.string().optional().describe('RFC3339 datetime, e.g. 2026-04-14T10:00:00+08:00'),
        attendees: z.array(z.object({ email: z.string() })).optional(),
        recurrence: z.array(z.string()).optional().describe('RRULE strings, e.g. ["RRULE:FREQ=WEEKLY;BYDAY=MO,WE"]'),
      }),
      execute: async (args) => {
        let startDatetime = args.startDatetime;
        let endDatetime = args.endDatetime;

        if (startDatetime) {
          const normalized = normalizeToRfc3339(startDatetime);
          if (!normalized) {
            return { complete: false, error: `startDatetime "${startDatetime}" is not a recognizable date.` };
          }
          startDatetime = normalized;
        }

        if (endDatetime) {
          const normalized = normalizeToRfc3339(endDatetime);
          if (!normalized) {
            return { complete: false, error: `endDatetime "${endDatetime}" is not a recognizable date.` };
          }
          endDatetime = normalized;
        }

        const effectiveArgs = { ...args, startDatetime, endDatetime };
        const missing = (['summary', 'startDatetime', 'endDatetime'] as const).filter((f) => !effectiveArgs[f]);
        const collected = Object.fromEntries(
          Object.entries(effectiveArgs).filter(([, v]) => v !== undefined && v !== 'primary'),
        );

        if (missing.length > 0) {
          return { complete: false, collected, missing };
        }

        return {
          complete: true,
          events: [{
            summary: args.summary!,
            description: args.description,
            startDatetime: startDatetime!,
            endDatetime: endDatetime!,
            attendees: args.attendees,
            recurrence: args.recurrence,
          }],
          message: 'All required fields collected. Now call create_events with the events array above.',
        };
      },
    }),

    create_events: tool({
      description: 'Create one or more events on the calendar. Requires user approval before executing.',
      inputSchema: z.object({
        calendarId: z.string().default('primary'),
        events: z.array(z.object({
          summary: z.string(),
          description: z.string().optional(),
          startDatetime: datetimeWithTz.describe('RFC3339 with timezone, e.g. 2026-04-14T09:00:00+08:00'),
          endDatetime: datetimeWithTz.describe('RFC3339 with timezone, e.g. 2026-04-14T10:00:00+08:00'),
          attendees: z.array(z.object({ email: z.string() })).optional(),
          recurrence: z.array(z.string()).optional(),
        })).min(1),
      }),
      needsApproval: true,
      execute: async (args) => {
        const incomplete = args.events.find((e) => !e.summary || !e.startDatetime || !e.endDatetime);
        if (incomplete) {
          return { success: false, error: 'Missing required fields. Use prepare_event_draft first.' };
        }
        const bodies = args.events.map((e) => ({
          summary: e.summary,
          description: e.description,
          start: { dateTime: e.startDatetime, timeZone: DEFAULT_TZ },
          end: { dateTime: e.endDatetime, timeZone: DEFAULT_TZ },
          attendees: e.attendees,
          recurrence: e.recurrence,
        }));
        const results = await createEvents(reqHeaders, args.calendarId, bodies);
        return {
          success: true,
          message: `${results.length} event(s) created.`,
          created: results.map((r) => ({ id: r.id, summary: r.summary })),
        };
      },
    }),

    edit_event: tool({
      description: 'Partially update an existing calendar event. Only include fields the user wants to change. Always include currentStartDatetime and currentEndDatetime from list_events so the user can see the current time slot. Requires user approval.',
      inputSchema: z.object({
        calendarId: z.string().default('primary'),
        eventId: z.string(),
        summary: z.string().optional(),
        description: z.string().optional(),
        startDatetime: z.string().optional().describe('RFC3339 datetime with timezone — only if the user wants to change it'),
        endDatetime: z.string().optional().describe('RFC3339 datetime with timezone — only if the user wants to change it'),
        recurrence: z.array(z.string()).optional(),
        currentStartDatetime: z.string().optional().describe('Current RFC3339 start from list_events — for display only'),
        currentEndDatetime: z.string().optional().describe('Current RFC3339 end from list_events — for display only'),
        currentSummary: z.string().optional().describe('Current event title from list_events — for display only'),
      }),
      needsApproval: true,
      execute: async (args) => {
        if (!args.eventId) {
          return { success: false, error: 'Missing eventId. Use list_events to find it.' };
        }

        let startDatetime = args.startDatetime;
        let endDatetime = args.endDatetime;

        if (startDatetime) {
          const normalized = normalizeToRfc3339(startDatetime);
          if (!normalized) {
            return { success: false, error: `startDatetime "${startDatetime}" could not be parsed. Please clarify.` };
          }
          startDatetime = normalized;
        }

        if (endDatetime) {
          const normalized = normalizeToRfc3339(endDatetime);
          if (!normalized) {
            return { success: false, error: `endDatetime "${endDatetime}" could not be parsed. Please clarify.` };
          }
          endDatetime = normalized;
        }

        const patch: Record<string, any> = {};
        if (args.summary !== undefined) patch.summary = args.summary;
        if (args.description !== undefined) patch.description = args.description;
        if (startDatetime !== undefined) patch.start = { dateTime: startDatetime, timeZone: DEFAULT_TZ };
        if (endDatetime !== undefined) patch.end = { dateTime: endDatetime, timeZone: DEFAULT_TZ };
        if (args.recurrence !== undefined) patch.recurrence = args.recurrence;

        await editEvent(reqHeaders, args.calendarId, args.eventId, patch);
        return { success: true, message: 'Event updated.' };
      },
    }),

    delete_event: tool({
      description: 'Delete a calendar event by ID. Requires user approval. Include summary, startDateTime, and endDateTime from list_events so the user can see which event is being deleted.',
      inputSchema: z.object({
        calendarId: z.string().default('primary'),
        eventId: z.string(),
        summary: z.string().describe('Event title from list_events'),
        startDateTime: z.string().optional().describe('RFC3339 start datetime from list_events'),
        endDateTime: z.string().optional().describe('RFC3339 end datetime from list_events'),
      }),
      needsApproval: true,
      execute: async (args) => {
        await deleteEvent(reqHeaders, args.calendarId, args.eventId);
        return { success: true, message: 'Event deleted.' };
      },
    }),
  };
}
