## ADDED Requirements

### Requirement: CONTINUE intent re-creates the originating agent
When the classifier returns `{ intent: "CONTINUE", continuationOf: "CREATE" | "EDIT" | "DELETE" }`, the route SHALL construct the same specialized agent that was running before the approval modal appeared.

#### Scenario: Approval confirmed after CREATE
- **WHEN** the user confirms an approval for `create_events`
- **THEN** the route SHALL create the CREATE agent and pass it the full message history including the approval response

#### Scenario: Approval denied after DELETE
- **WHEN** the user denies an approval for `delete_event`
- **THEN** the route SHALL create the DELETE agent so it can handle the denial response naturally

### Requirement: CONTINUE intent is detected from message history
The classifier SHALL return `CONTINUE` when the most recent assistant message contains any tool part with `state === "approval-requested"`. The `continuationOf` value SHALL be derived from the `toolName` of that part.

#### Scenario: Detecting pending approval
- **WHEN** the last assistant message has a tool part `{ toolName: "create_events", state: "approval-requested" }`
- **THEN** the classifier SHALL return `{ intent: "CONTINUE", continuationOf: "CREATE" }`

#### Scenario: No pending approval
- **WHEN** no tool part with `state === "approval-requested"` exists in the last assistant message
- **THEN** the classifier SHALL NOT return `CONTINUE`
