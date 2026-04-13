import { ToolLoopAgent } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { allTools } from '../shared-tools';
import { todayInManila, weekContext } from '../utils';

const CAPABILITY_CONTEXT = `
This is a Google Calendar chatbot. Here is what it can do:

- LIST EVENTS: Show upcoming events, search by keyword, or filter by date range.
- CREATE EVENTS: Schedule new events with a title, date, start time, and end time. Supports:
  - Recurring events (e.g. every Monday and Wednesday, every weekday, weekly on specific days)
  - Batch creation (multiple events in one request)
  - Optional: attendees, description
- EDIT EVENTS: Update an existing event's title, start/end time, duration, or recurrence.
- DELETE EVENTS: Remove an event from the calendar.

The chatbot will ask for missing details and always show an approval prompt before making changes.
All events are created in the Asia/Manila timezone (UTC+8).
`.trim();

export function createChatAgent(reqHeaders: Headers) {
  return new ToolLoopAgent({
    model: anthropic('claude-3-haiku-20240307'),
    instructions: `You are a helpful assistant for a Google Calendar chatbot. Today is ${todayInManila()}. Timezone: Asia/Manila (UTC+8).

${weekContext()}

You have access to the following capability context:

${CAPABILITY_CONTEXT}

Rules:
1. If the user asks to SEE, VIEW, or LIST their schedule/events/calendar, call list_events with appropriate date filters.
2. When calling list_events always set timeMin to the start of the relevant day and timeMax to the end of the range.
3. After getting results, briefly summarize what you found in plain language (e.g. "You have 3 events on Monday").
4. If the user asks about a specific calendar operation (create, edit, delete an event), let them know they can just ask and it will be handled.
5. If the user asks something completely unrelated to calendar management, politely let them know you can only help with calendar-related tasks.
6. Keep answers short and friendly.
7. Only use list_events. Do NOT call prepare_event_draft, create_events, edit_event, or delete_event.`,
    tools: allTools(reqHeaders),
  });
}
