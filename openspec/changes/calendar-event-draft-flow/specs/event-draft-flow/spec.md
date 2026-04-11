## ADDED Requirements

### Requirement: Draft tool collects required event fields across turns
The system SHALL provide a `prepare_event_draft` tool that the model calls with whatever event fields it has gathered so far. The tool SHALL validate the input and return a structured response indicating which required fields are present, which are missing, and whether the draft is complete.

Required fields for event creation: `summary`, `startDatetime`, `endDatetime`.
Optional fields: `description`, `attendees`, `recurrence`, `calendarId`.

#### Scenario: Draft called with no required fields
- **WHEN** `prepare_event_draft` is called with none of the required fields
- **THEN** the tool SHALL return `{ complete: false, collected: {}, missing: ["summary", "startDatetime", "endDatetime"] }`

#### Scenario: Draft called with some required fields
- **WHEN** `prepare_event_draft` is called with `summary` but not `startDatetime` or `endDatetime`
- **THEN** the tool SHALL return `{ complete: false, collected: { summary: "..." }, missing: ["startDatetime", "endDatetime"] }`

#### Scenario: Draft called with all required fields
- **WHEN** `prepare_event_draft` is called with `summary`, `startDatetime`, and `endDatetime` all present
- **THEN** the tool SHALL return `{ complete: true, events: [<fully formed event object>], message: "All required fields collected. Now call create_events with the events array above." }`

#### Scenario: Draft called with all required fields and recurrence
- **WHEN** `prepare_event_draft` is called with all required fields plus a valid `recurrence` array
- **THEN** the tool SHALL return `{ complete: true, events: [<event object including recurrence>] }`

### Requirement: Create mutation tool rejects incomplete input
The `create_events` tool SHALL reject execution if any event in the input array is missing `summary`, `startDatetime`, or `endDatetime`, returning an error that instructs the model to use `prepare_event_draft` first.

#### Scenario: create_events called without summary
- **WHEN** `create_events` is called with an event missing `summary`
- **THEN** the tool SHALL return `{ success: false, error: "Missing required fields. Use prepare_event_draft to collect all required event details before calling create_events." }`

#### Scenario: create_events called with complete input
- **WHEN** `create_events` is called with all required fields present on every event
- **THEN** the tool SHALL proceed to the approval step and execute normally

### Requirement: Edit draft tool collects required fields for event updates
The system SHALL provide a `prepare_edit_draft` tool that the model calls with the `eventId` and any fields to be updated. The tool SHALL validate that `eventId` is present and at least one field is being changed.

Required fields for event editing: `eventId`, plus at least one of `summary`, `startDatetime`, `endDatetime`, `description`, `recurrence`.

#### Scenario: Edit draft called without eventId
- **WHEN** `prepare_edit_draft` is called without an `eventId`
- **THEN** the tool SHALL return `{ complete: false, missing: ["eventId"], message: "eventId is required. Use list_events to find the event ID first." }`

#### Scenario: Edit draft called with eventId but no fields to change
- **WHEN** `prepare_edit_draft` is called with only `eventId` and no other fields
- **THEN** the tool SHALL return `{ complete: false, missing: ["at least one field to update"], message: "Provide at least one field to update (summary, startDatetime, endDatetime, description, or recurrence)." }`

#### Scenario: Edit draft called with eventId and at least one field
- **WHEN** `prepare_edit_draft` is called with `eventId` and one or more update fields
- **THEN** the tool SHALL return `{ complete: true, editArgs: { calendarId, eventId, ...collectedFields }, message: "All required fields collected. Now call edit_event with the editArgs above." }`

### Requirement: Edit mutation tool rejects calls without eventId
The `edit_event` tool SHALL reject execution if `eventId` is missing or empty, returning an error that instructs the model to use `prepare_edit_draft`.

#### Scenario: edit_event called without eventId
- **WHEN** `edit_event` is called without a valid `eventId`
- **THEN** the tool SHALL return `{ success: false, error: "Missing eventId. Use list_events to find the event and prepare_edit_draft to prepare the update." }`

#### Scenario: edit_event called with valid eventId
- **WHEN** `edit_event` is called with a valid `eventId` and at least one field to update
- **THEN** the tool SHALL proceed to the approval step and execute normally

### Requirement: System prompt references draft tools as required first step
The system prompt SHALL instruct the model to call `prepare_event_draft` before `create_events` and `prepare_edit_draft` before `edit_event`, treating them as mandatory first steps for these flows.

#### Scenario: Model receives instruction about draft tools
- **WHEN** the chat session begins
- **THEN** the model SHALL have instructions stating that `prepare_event_draft` and `prepare_edit_draft` MUST be called before their respective mutation tools
