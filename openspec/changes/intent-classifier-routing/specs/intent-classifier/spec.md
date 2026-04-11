## ADDED Requirements

### Requirement: Intent is classified before agent dispatch
The system SHALL classify user intent from message history before creating any agent. Classification SHALL use `generateObject` with claude-3-haiku and return a structured `{ intent, continuationOf? }` object. The result SHALL determine which specialized agent is constructed and returned.

#### Scenario: Clear creation intent
- **WHEN** the user message contains a request to add, schedule, or create an event
- **THEN** the classifier SHALL return `{ intent: "CREATE" }`

#### Scenario: Clear edit intent
- **WHEN** the user message contains a request to update, change, move, or edit an existing event
- **THEN** the classifier SHALL return `{ intent: "EDIT" }`

#### Scenario: Clear delete intent
- **WHEN** the user message contains a request to remove, delete, or cancel an existing event
- **THEN** the classifier SHALL return `{ intent: "DELETE" }`

#### Scenario: Capability question
- **WHEN** the user asks what the chatbot can do, or asks a general question not related to a specific calendar operation
- **THEN** the classifier SHALL return `{ intent: "CHAT" }`

#### Scenario: Approval resumption
- **WHEN** the last assistant message contains a tool part with `state === "approval-requested"`
- **THEN** the classifier SHALL return `{ intent: "CONTINUE", continuationOf: "<originating-intent>" }`

#### Scenario: Multi-intent message
- **WHEN** the user message contains two distinct intents (e.g. "add X and delete Y")
- **THEN** the classifier SHALL return the primary intent only and the agent SHALL defer the secondary action

### Requirement: Classification failure is handled gracefully
The system SHALL fall back to the CHAT agent if the classifier call throws or returns an unrecognized intent, rather than returning a 500 error.

#### Scenario: Classifier throws
- **WHEN** `generateObject` throws an error during classification
- **THEN** the route SHALL log the error and dispatch to the CHAT agent as a safe fallback
