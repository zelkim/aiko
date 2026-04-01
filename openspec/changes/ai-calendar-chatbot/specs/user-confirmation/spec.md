## ADDED Requirements

### Requirement: Confirmation request from agent
The system SHALL allow the AI agent to request user confirmation during a conversation by emitting a structured confirmation event with a question, selectable options, and an optional free-form input flag.

#### Scenario: Agent asks for calendar selection
- **WHEN** the agent cannot infer which calendar to use for an event
- **THEN** the agent emits a `confirmation_request` event containing the question, a list of the user's available calendars as options, and allows free-form input

#### Scenario: Agent asks for event details confirmation
- **WHEN** the agent has parsed event details and wants user approval before creating
- **THEN** the agent emits a `confirmation_request` event showing the proposed event details with "Confirm" and "Edit" options

### Requirement: Confirmation modal UI
The system SHALL render a modal or inline confirmation component when a `confirmation_request` event is received, displaying the question, selectable choice buttons, and an optional text input field.

#### Scenario: Modal displays with choices
- **WHEN** a `confirmation_request` event is received with options
- **THEN** a modal/dialog appears showing the question and clickable option buttons

#### Scenario: Modal with free-form input
- **WHEN** a `confirmation_request` event has `allowFreeform: true`
- **THEN** the modal includes a text input field in addition to the preset options

#### Scenario: Modal without free-form input
- **WHEN** a `confirmation_request` event has `allowFreeform: false`
- **THEN** the modal shows only the preset options with no text input field

### Requirement: Confirmation response handling
The system SHALL send the user's confirmation response back to the server as a special message that resumes the agentic loop from where it paused.

#### Scenario: User selects a preset option
- **WHEN** user clicks one of the preset option buttons
- **THEN** the selection is sent as a `confirmation_response` message and the modal closes

#### Scenario: User provides free-form input
- **WHEN** user types a custom response in the free-form field and submits
- **THEN** the custom text is sent as a `confirmation_response` message and the modal closes

#### Scenario: Conversation history includes confirmations
- **WHEN** a confirmation exchange occurs
- **THEN** both the question and the user's response are visible in the conversation history as normal messages

### Requirement: Confirmation data schema
The system SHALL validate confirmation requests and responses using Zod schemas to ensure type safety.

#### Scenario: Valid confirmation request
- **WHEN** the agent constructs a confirmation request
- **THEN** it MUST contain: `question` (string), `options` (array of `{label: string, value: string}`), and `allowFreeform` (boolean)

#### Scenario: Valid confirmation response
- **WHEN** the user responds to a confirmation
- **THEN** the response MUST contain: `selectedOption` (string, matching an option value or custom text) and `confirmationId` (string, matching the request)
