## 1. Project Initialization

- [x] 1.1 Scaffold Next.js project with App Router, TypeScript, and TailwindCSS
- [x] 1.2 Initialize Prisma, configure PostgreSQL connection, and create base schema (Conversation, Message, CalendarAccount, UserPreference)
- [ ] 1.3 Install and configure ShadCN UI with initial required components (Button, Dialog, Input, ScrollArea)
- [ ] 1.4 Create `.env.template` with documented placeholders for API keys and database URL
- [ ] 1.5 Update README.md with project overview, setup instructions, and the "source of truth" policy

## 2. Calendar API & Database Setup

- [ ] 2.1 Set up Google OAuth 2.0 flow for Calendar API and store credentials via Prisma
- [ ] 2.2 Implement core Calendar API wrapper (list calendars, create/edit/delete single events)
- [ ] 2.3 Implement Google Calendar Batch API support for bulk event operations
- [ ] 2.4 Create database queries for saving and retrieving conversation history (Messages & Conversations)
- [ ] 2.5 Implement context windowing logic (fetching recent messages + summarizing older ones)

## 3. AI Agent Core

- [ ] 3.1 Install `@anthropic-ai/sdk` and configure direct connection to Claude APIs
- [ ] 3.2 Define Zod schemas for all calendar tools (`create_event`, `edit_event`, `delete_event`, `list_events`)
- [ ] 3.3 Implement the server-side agentic loop in Next.js Route Handler (`/api/chat`)
- [ ] 3.4 Add tool execution routing (mapping LLM tool calls to the actual Calendar API functions)
- [ ] 3.5 Implement streaming response protocol (delivering text, tool_call_starts, and results as SSE)

## 4. User Confirmation System

- [ ] 4.1 Define the `confirmation_request` event schema and add it to the streaming protocol
- [ ] 4.2 Update the agentic loop to pause and wait when a tool (or calendar inference) requires confirmation
- [ ] 4.3 Create the front-end Confirmation Modal ShadCN component handling both preset options and free-form input
- [ ] 4.4 Implement processing of `confirmation_response` messages to resume the paused agentic loop

## 5. Chat Interface

- [ ] 5.1 Build the main chat dashboard layout with a sidebar for conversation history
- [ ] 5.2 Implement the message list component with distinct styling for User vs Assistant
- [ ] 5.3 Build the multi-line chat input component with Enter/Shift+Enter support
- [ ] 5.4 Connect the UI to the streaming API, rendering text progressively and showing tool/confirmation UI inline
- [ ] 5.5 Add loading indicators and disable inputs during response streaming

## 6. Polish & Testing

- [ ] 6.1 Test the multi-action agent prompt (e.g., "create a meeting with John at 3:30, and Jane at 4") verifying batch API usage
- [ ] 6.2 Verify the calendar inference prompt flow triggers the confirmation modal appropriately
- [ ] 6.3 Ensure token usage is tracked and context windowing behaves correctly for long conversations
- [ ] 6.4 Review error handling for expiring OAuth tokens and LLM API failures
