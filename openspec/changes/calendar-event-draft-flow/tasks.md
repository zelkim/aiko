## 1. Add `prepare_event_draft` Tool

- [x] 1.1 Define `prepare_event_draft` tool in `src/app/api/chat/route.ts` with an inputSchema accepting all event fields as optional (`summary`, `description`, `startDatetime`, `endDatetime`, `attendees`, `recurrence`, `calendarId`)
- [x] 1.2 Implement execute: check which required fields (`summary`, `startDatetime`, `endDatetime`) are present and return `{ complete: false, collected, missing }` when any are absent
- [x] 1.3 Implement the complete path: when all required fields are present, return `{ complete: true, events: [<fully formed event body>], message: "All required fields collected. Now call create_events with the events array above." }`

## 2. Add `prepare_edit_draft` Tool

- [x] 2.1 Define `prepare_edit_draft` tool in `src/app/api/chat/route.ts` with an inputSchema accepting `eventId` and all optional update fields (`summary`, `startDatetime`, `endDatetime`, `description`, `recurrence`, `calendarId`)
- [x] 2.2 Implement execute: return `{ complete: false, missing: ["eventId"] }` when `eventId` is absent
- [x] 2.3 Implement execute: return `{ complete: false, missing: ["at least one field to update"] }` when `eventId` is present but no update fields are provided
- [x] 2.4 Implement the complete path: when `eventId` plus at least one update field is present, return `{ complete: true, editArgs: { calendarId, eventId, ...fields }, message: "All required fields collected. Now call edit_event with the editArgs above." }`

## 3. Guard Mutation Tools Against Incomplete Input

- [x] 3.1 Add a completeness guard at the top of `create_events`'s `execute` function: iterate over `args.events` and return `{ success: false, error: "Missing required fields. Use prepare_event_draft to collect all required event details before calling create_events." }` if any event is missing `summary`, `startDatetime`, or `endDatetime`
- [x] 3.2 Add a completeness guard at the top of `edit_event`'s `execute` function: return `{ success: false, error: "Missing eventId. Use list_events to find the event and prepare_edit_draft to prepare the update." }` if `args.eventId` is absent or empty

## 4. Update System Prompt

- [x] 4.1 Update the system prompt in `src/app/api/chat/route.ts` to explicitly state that `prepare_event_draft` MUST be called before `create_events`, and `prepare_edit_draft` MUST be called before `edit_event`, removing the previous free-text instruction to ask questions first
