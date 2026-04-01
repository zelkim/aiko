## ADDED Requirements

### Requirement: Agentic tool-calling loop
The system SHALL implement a server-side agentic loop that processes user messages, invokes tools as needed, and continues iterating until a final text response is produced.

#### Scenario: Single tool call
- **WHEN** a user message requires one tool call (e.g., "create a meeting at 3 PM")
- **THEN** the agent calls the appropriate tool, feeds the result back to the LLM, and produces a final text response

#### Scenario: Multiple sequential tool calls
- **WHEN** a user message requires multiple actions (e.g., "create a meeting with John at 3:30 PM, and Jane at 4")
- **THEN** the agent executes all required tool calls in sequence (or parallel where independent), feeding results back to the LLM after each, until a final response is generated

#### Scenario: No tool call needed
- **WHEN** a user message is conversational and requires no tool calls
- **THEN** the agent produces a direct text response without invoking any tools

### Requirement: Direct Anthropic Integration
The system SHALL use the official Anthropic SDK (`@anthropic-ai/sdk`) directly to communicate with Claude, sending messages and receiving streaming responses with tool-call support.

#### Scenario: Successful LLM request with streaming
- **WHEN** the agent sends a conversation to the Anthropic API
- **THEN** the response is streamed back token-by-token using Anthropic's streaming interface, and tool calls are parsed from the stream as they arrive

#### Scenario: API key not configured
- **WHEN** the Anthropic API key is missing or invalid
- **THEN** the system returns a clear error message indicating the key needs to be configured

### Requirement: Tool definition registry
The system SHALL maintain a registry of available tools with their names, descriptions, and Zod-validated parameter schemas that are sent to the LLM as function definitions.

#### Scenario: Tools are sent with each LLM request
- **WHEN** the agent makes a request to the LLM
- **THEN** all registered tools and their schemas are included in the request so the LLM can choose which to call

#### Scenario: Tool parameter validation
- **WHEN** the LLM returns a tool call with parameters
- **THEN** the parameters are validated against the tool's Zod schema before execution, and invalid parameters result in an error fed back to the LLM

### Requirement: Streaming events protocol
The system SHALL stream structured events to the client during the agentic loop, including: text tokens, tool call starts, tool call results, confirmation requests, and completion signals.

#### Scenario: Client receives text stream
- **WHEN** the LLM generates text tokens
- **THEN** each token is streamed to the client as a `text_delta` event

#### Scenario: Client receives tool call event
- **WHEN** the agent begins executing a tool call
- **THEN** a `tool_call_start` event is streamed with the tool name and parameters

#### Scenario: Client receives tool result event
- **WHEN** a tool call completes
- **THEN** a `tool_call_result` event is streamed with the outcome

#### Scenario: Stream completion
- **WHEN** the agentic loop finishes (final text response complete)
- **THEN** a `done` event is streamed and the connection closes

### Requirement: Error handling in agentic loop
The system SHALL handle errors during tool execution gracefully, feeding error information back to the LLM so it can inform the user or retry.

#### Scenario: Tool execution fails
- **WHEN** a tool call fails (e.g., Google Calendar API error)
- **THEN** the error is captured, formatted as a tool result with error details, and fed back to the LLM so it can explain the failure to the user

#### Scenario: LLM request fails
- **WHEN** the LLM API request fails (rate limit, network error)
- **THEN** the system streams an error event to the client with a user-friendly message and retries up to a configured limit
