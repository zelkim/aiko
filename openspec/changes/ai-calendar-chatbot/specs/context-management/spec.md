## ADDED Requirements

### Requirement: Conversation history persistence
The system SHALL persist all conversation messages (user, assistant, tool calls, confirmations) in the database so they can be loaded and used as context for future messages.

#### Scenario: Messages are saved
- **WHEN** a message is sent or received in a conversation
- **THEN** the message is persisted in the database with its role, content, and metadata

#### Scenario: Conversation reload
- **WHEN** a user returns to an existing conversation
- **THEN** the full message history is loaded from the database and displayed in the chat UI

### Requirement: Context window management
The system SHALL implement a sliding window strategy that includes the most recent N messages in full detail and summarizes older messages to stay within the LLM's context limits.

#### Scenario: Recent messages sent in full
- **WHEN** the conversation has fewer than the window limit of messages
- **THEN** all messages are sent to the LLM in full detail

#### Scenario: Older messages summarized
- **WHEN** the conversation exceeds the window limit
- **THEN** messages beyond the window are replaced with a compressed summary, and only the recent window is sent in full

### Requirement: System prompt management
The system SHALL maintain a system prompt that includes the agent's persona, available tools description, user preferences (timezone, default calendar), and current date/time context.

#### Scenario: System prompt includes user context
- **WHEN** a request is sent to the LLM
- **THEN** the system prompt includes the user's timezone, connected calendars, and default calendar preference

#### Scenario: System prompt includes current time
- **WHEN** a request is sent to the LLM
- **THEN** the system prompt includes the current date and time so the agent can interpret relative time references (e.g., "tomorrow", "next Monday")

### Requirement: Tool result context optimization
The system SHALL optimize how tool results are included in context, truncating verbose API responses while preserving essential information.

#### Scenario: Large tool result truncation
- **WHEN** a tool call returns a large response (e.g., a full calendar listing)
- **THEN** the result is truncated to essential fields before being included in the conversation context

#### Scenario: Error results preserved
- **WHEN** a tool call results in an error
- **THEN** the full error information is preserved in context so the LLM can address the issue

### Requirement: Token usage tracking
The system SHALL track token usage per conversation and per request to enable monitoring and cost optimization.

#### Scenario: Per-request token count
- **WHEN** an LLM request completes
- **THEN** the input and output token counts are logged with the conversation

#### Scenario: Conversation token budget warning
- **WHEN** a conversation's cumulative token usage approaches a configurable threshold
- **THEN** the system logs a warning and may trigger more aggressive context summarization
