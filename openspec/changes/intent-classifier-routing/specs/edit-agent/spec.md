## ADDED Requirements

### Requirement: EDIT agent only has edit tools
The EDIT agent SHALL be constructed with exactly two tools: `list_events` and `edit_event`. `prepare_event_draft`, `prepare_edit_draft`, `create_events`, and `delete_event` SHALL NOT be present.

#### Scenario: Create tool unavailable in EDIT agent
- **WHEN** the EDIT agent is running
- **THEN** `create_events` and `prepare_event_draft` SHALL NOT be callable

### Requirement: EDIT agent uses event ID from context before calling list_events
If the message history contains a prior `create_events` tool result with a `created[].id` matching the described event, the EDIT agent SHALL use that ID directly without calling `list_events`.

#### Scenario: ID already in history
- **WHEN** the user says "change the end time" and a prior `create_events` result is in history
- **THEN** the agent SHALL call `edit_event` directly with the known ID

#### Scenario: ID not in history
- **WHEN** the agent cannot find a matching event ID in message history
- **THEN** the agent SHALL call `list_events` to find it before calling `edit_event`

### Requirement: EDIT agent performs partial updates only
`edit_event` SHALL use `events.patch` (not `events.update`). Only fields explicitly provided by the user SHALL be included in the patch body. Fields not mentioned SHALL be omitted, preserving their existing values on Google Calendar.

#### Scenario: Duration-only edit
- **WHEN** the user says "change it to 1.5 hours"
- **THEN** only `end.dateTime` SHALL be updated; `summary`, `recurrence`, and other fields SHALL be unchanged

### Requirement: EDIT agent normalizes datetime inputs inline
`edit_event.execute()` SHALL run `normalizeToRfc3339()` on any provided datetime strings before sending to the Google Calendar API. On normalization failure, it SHALL return `{ success: false, error }` so the model asks the user to clarify.

#### Scenario: Missing timezone on datetime
- **WHEN** the model passes `2026-04-15T16:00:00` (no timezone)
- **THEN** execute SHALL normalize to `2026-04-15T16:00:00+08:00` and proceed
