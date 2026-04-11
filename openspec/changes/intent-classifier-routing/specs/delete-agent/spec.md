## ADDED Requirements

### Requirement: DELETE agent only has delete tools
The DELETE agent SHALL be constructed with exactly two tools: `list_events` and `delete_event`. No creation or edit tools SHALL be present.

#### Scenario: Edit tool unavailable in DELETE agent
- **WHEN** the DELETE agent is running
- **THEN** `create_events`, `edit_event`, and `prepare_event_draft` SHALL NOT be callable

### Requirement: DELETE agent finds event ID automatically
The DELETE agent SHALL call `list_events` to find the event ID. It SHALL NOT ask the user for an event ID.

#### Scenario: User names event to delete
- **WHEN** the user says "delete my CCPROG1 class"
- **THEN** the agent SHALL call `list_events` with a relevant query, identify the matching event, then call `delete_event` with its ID

#### Scenario: Ambiguous match
- **WHEN** `list_events` returns multiple events that could match the user's description
- **THEN** the agent SHALL ask the user to clarify which specific event to delete before proceeding
