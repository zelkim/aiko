## ADDED Requirements

### Requirement: CREATE agent only has creation tools
The CREATE agent SHALL be constructed with exactly two tools: `prepare_event_draft` and `create_events`. No other tools SHALL be present.

#### Scenario: Edit tool unavailable in CREATE agent
- **WHEN** the CREATE agent is running
- **THEN** `edit_event`, `delete_event`, and `list_events` SHALL NOT be callable

#### Scenario: Full creation flow
- **WHEN** the user provides a title, date, start time, and end time
- **THEN** the agent SHALL call `prepare_event_draft`, receive `complete: true`, then call `create_events` immediately without asking for confirmation

### Requirement: CREATE agent result includes event IDs
The `create_events` tool SHALL return `created: [{ id, summary }]` for all created events so the model has event IDs available for subsequent EDIT requests in the same session.

#### Scenario: Event IDs in tool result
- **WHEN** `create_events` executes successfully
- **THEN** the tool result SHALL contain a `created` array with `id` and `summary` for each event

### Requirement: CREATE agent asks for minimum required fields only
The CREATE agent SHALL only ask for: event title, date, start time, and end time (or duration). It SHALL NOT ask for description, attendees, location, or other optional fields unless the user volunteers them.

#### Scenario: Minimum fields
- **WHEN** the user provides only a title
- **THEN** the agent SHALL ask for date, start time, and end time in a single friendly message — not three separate messages
