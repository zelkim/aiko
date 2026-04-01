## ADDED Requirements

### Requirement: Chat message display
The system SHALL display chat messages in a scrollable conversation view, distinguishing between user messages and assistant messages with distinct visual styling.

#### Scenario: User sends a message
- **WHEN** user types a message and presses Enter or clicks Send
- **THEN** the message appears immediately in the conversation view as a user message, and the input field is cleared

#### Scenario: Assistant response is displayed
- **WHEN** the assistant responds to a user message
- **THEN** the assistant's response appears in the conversation view with distinct assistant styling

### Requirement: Streaming response rendering
The system SHALL render assistant responses incrementally as tokens stream in, so the user sees text appearing in real-time.

#### Scenario: Streamed response appears progressively
- **WHEN** the server streams response tokens
- **THEN** the chat UI appends each token to the assistant's message in real-time without waiting for the full response

#### Scenario: Streaming indicator shown during generation
- **WHEN** the assistant is generating a response
- **THEN** a visual indicator (typing/loading animation) is shown until the response completes

### Requirement: Chat input controls
The system SHALL provide a text input area with send button that supports multi-line input and keyboard shortcuts.

#### Scenario: Multi-line input
- **WHEN** user presses Shift+Enter in the input field
- **THEN** a new line is inserted in the input without sending the message

#### Scenario: Send via Enter key
- **WHEN** user presses Enter (without Shift) in the input field
- **THEN** the message is sent to the assistant

#### Scenario: Input disabled during streaming
- **WHEN** the assistant is currently streaming a response
- **THEN** the send button is disabled and the input indicates that processing is in progress

### Requirement: Conversation management
The system SHALL support multiple conversations with the ability to create new conversations and switch between them.

#### Scenario: New conversation
- **WHEN** user clicks "New Chat" or equivalent action
- **THEN** a new empty conversation is created and becomes the active conversation

#### Scenario: Conversation list
- **WHEN** user views the sidebar or conversation list
- **THEN** all existing conversations are listed with their titles and timestamps

### Requirement: Tool call visibility
The system SHALL display tool call activity inline within the conversation so the user understands what the agent is doing.

#### Scenario: Tool call in progress
- **WHEN** the agent executes a tool call (e.g., creating a calendar event)
- **THEN** the UI shows an inline indicator of which tool is being called and its parameters

#### Scenario: Tool call result
- **WHEN** a tool call completes
- **THEN** the result is displayed inline (collapsed by default, expandable for details)
