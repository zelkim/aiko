import { z } from "zod";

export const calendarTools = {
  list_events: {
    name: "list_events",
    description: "List calendar events for a given time range.",
    inputSchema: z.object({
      calendarId: z.string().default("primary"),
      timeMin: z.string().optional().describe("ISO datetime string for start of range"),
      timeMax: z.string().optional().describe("ISO datetime string for end of range"),
      q: z.string().optional().describe("Free text search terms to find events"),
    }),
  },
  create_events: {
    name: "create_events",
    description: "Create one or more events on the calendar. Accepts an array of events to create them all in a single batch.",
    inputSchema: z.object({
      calendarId: z.string().default("primary"),
      events: z.array(
        z.object({
          summary: z.string().describe("Title of the event"),
          description: z.string().optional(),
          start: z.object({ dateTime: z.string() }).describe("Start time as ISO string inside a dateTime object"),
          end: z.object({ dateTime: z.string() }).describe("End time as ISO string inside a dateTime object"),
          attendees: z.array(z.object({ email: z.string() })).optional(),
          recurrence: z.array(z.string()).optional().describe("Array of RRULE strings. Example: ['RRULE:FREQ=WEEKLY;BYDAY=MO'], ['RRULE:FREQ=MONTHLY;BYDAY=1MO']"),
        })
      ).min(1).describe("Array of events to create"),
    }),
  },
  edit_event: {
    name: "edit_event",
    description: "Edit an existing event on the calendar. Only provide fields you want to update.",
    inputSchema: z.object({
      calendarId: z.string().default("primary"),
      eventId: z.string().describe("ID of the event to edit"),
      summary: z.string().optional(),
      description: z.string().optional(),
      start: z.object({ dateTime: z.string() }).optional(),
      end: z.object({ dateTime: z.string() }).optional(),
      recurrence: z.array(z.string()).optional().describe("Array of RRULE strings. Set to empty array to stop recurrence."),
    }),
  },
  delete_event: {
    name: "delete_event",
    description: "Delete an event from the calendar.",
    inputSchema: z.object({
      calendarId: z.string().default("primary"),
      eventId: z.string().describe("ID of the event to delete"),
    }),
  },
};
