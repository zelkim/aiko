## ADDED Requirements

### Requirement: CHAT agent has no tools
The CHAT agent SHALL be constructed with an empty tools map. It SHALL have no ability to read or mutate calendar data.

#### Scenario: No tool calls in CHAT responses
- **WHEN** the CHAT agent handles a message
- **THEN** its response SHALL contain no tool calls

### Requirement: CHAT agent answers capability questions from string context
The CHAT agent's system prompt SHALL include a hardcoded plain-text description of the chatbot's capabilities. It SHALL answer questions about what the chatbot can do based solely on this context.

#### Scenario: Capability question
- **WHEN** the user asks "what can you do?" or "can you help me with recurring events?"
- **THEN** the agent SHALL answer using only the capability context string

### Requirement: CHAT agent declines out-of-scope questions
The CHAT agent SHALL politely decline questions that are outside the scope of calendar management (e.g. general knowledge, coding help, unrelated tasks).

#### Scenario: Out-of-scope question
- **WHEN** the user asks something unrelated to calendar management
- **THEN** the agent SHALL inform the user it can only help with calendar-related tasks
