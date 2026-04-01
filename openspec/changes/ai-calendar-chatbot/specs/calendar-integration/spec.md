## ADDED Requirements

### Requirement: Google Calendar OAuth authentication
The system SHALL authenticate with Google Calendar API using OAuth 2.0, storing access and refresh tokens securely in the database.

#### Scenario: Initial OAuth flow
- **WHEN** user initiates Google Calendar connection
- **THEN** the system redirects to Google's OAuth consent screen, and upon approval, stores the access token and refresh token in the database

#### Scenario: Token refresh
- **WHEN** the stored access token has expired
- **THEN** the system automatically refreshes the token using the stored refresh token before making API calls

#### Scenario: Token revoked
- **WHEN** the refresh token is revoked or invalid
- **THEN** the system prompts the user to re-authenticate via the OAuth flow

### Requirement: Calendar listing and selection
The system SHALL retrieve all calendars associated with the authenticated Google account and allow the agent to reference them by name or ID.

#### Scenario: List available calendars
- **WHEN** the agent needs to determine available calendars
- **THEN** the system fetches and returns all writable calendars from the user's Google account with their names and IDs

#### Scenario: Default calendar inference
- **WHEN** the user does not specify a target calendar in their prompt
- **THEN** the agent infers the most likely calendar based on event context (e.g., work meetings → work calendar) or asks the user via a confirmation request

### Requirement: Event creation
The system SHALL create Google Calendar events with support for title, start/end time, attendees, description, and location.

#### Scenario: Create single event
- **WHEN** the agent calls the create_event tool with valid event parameters
- **THEN** a calendar event is created via the Google Calendar API and the event link is returned

#### Scenario: Create event with attendees
- **WHEN** the agent creates an event that mentions other people (e.g., "meeting with John")
- **THEN** the event includes attendee email addresses if resolvable, or the agent asks for clarification

### Requirement: Event editing
The system SHALL support editing existing Google Calendar events including modifying time, title, attendees, and other fields.

#### Scenario: Reschedule event
- **WHEN** the user asks to move an event to a different time
- **THEN** the agent finds the event, updates its start/end time via the Google Calendar API, and confirms the change

#### Scenario: Edit event details
- **WHEN** the user asks to change event details (title, description, location, attendees)
- **THEN** the agent updates the specified fields on the existing event

### Requirement: Event querying
The system SHALL support querying Google Calendar events by date range, keyword, or attendee to provide context for scheduling decisions.

#### Scenario: Check availability
- **WHEN** the user asks "am I free at 3 PM tomorrow?"
- **THEN** the agent queries events for that time range and reports whether there are conflicts

#### Scenario: List events for a date
- **WHEN** the user asks "what's on my calendar tomorrow?"
- **THEN** the agent fetches all events for that date range and lists them with times and titles

### Requirement: Batch operations
The system SHALL use Google Calendar's batch API endpoint to execute multiple event operations in a single HTTP request when the agent identifies multiple actions to perform.

#### Scenario: Batch event creation
- **WHEN** the agent needs to create 2 or more events from a single user request
- **THEN** the events are created using a single batch API call to `https://www.googleapis.com/batch/calendar/v3`

#### Scenario: Batch result handling
- **WHEN** a batch request completes
- **THEN** each individual operation's success or failure is parsed and reported back to the agent

#### Scenario: Batch size limit enforcement
- **WHEN** the agent needs to create more than 50 events in a batch
- **THEN** the operations are split into multiple batch requests of 50 or fewer

### Requirement: Calendar event deletion
The system SHALL support deleting Google Calendar events by event ID or by identifying the event from user description.

#### Scenario: Delete specific event
- **WHEN** the user asks to cancel/delete a specific event
- **THEN** the agent identifies the event, confirms deletion with the user via confirmation modal, and deletes it via the API

#### Scenario: Delete with confirmation
- **WHEN** the agent is about to delete an event
- **THEN** a confirmation request is shown to the user before the deletion is executed
