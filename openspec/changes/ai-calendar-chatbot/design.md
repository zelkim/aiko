## Context

This is a greenfield Next.js application — there is no existing codebase. The project creates an agentic AI chatbot for calendar scheduling, integrating with Google Calendar and using Anthropic's Claude directly as the AI backbone.

Key constraints:
- **Tech stack**: Next.js (App Router), Prisma (PostgreSQL), Zod, ShadCN UI, TailwindCSS
- **AI provider**: Anthropic Claude via official `@anthropic-ai/sdk`
- **Calendar provider**: Google Calendar API (OAuth 2.0)
- **Agentic behavior**: Must support multi-tool-call sequences per user message
- **Streaming**: Responses must stream to the client in real-time
- **User confirmation**: The agent must be able to pause execution and ask the user structured questions mid-conversation

## Goals / Non-Goals

**Goals:**
- Deliver a working chat UI that streams AI responses in real-time
- Support agentic multi-step tool calling (e.g., "create a meeting with John at 3:30 PM, and Jane at 4" triggers two `create_event` tool calls)
- Implement a user confirmation modal for ambiguous actions (calendar selection, conflicting events)
- Integrate with Google Calendar API with batch support for bulk operations
- Manage conversation context efficiently to minimize token usage
- Establish project scaffolding with proper env configuration and documentation practices

**Non-Goals:**
- Multi-user auth system (single-user for now; auth can be layered later)
- Support for calendar providers other than Google Calendar
- Mobile-native app (web-only, responsive design via ShadCN)
- Voice input or NLP beyond what Claude provides
- Recurring event complex rule editor (basic recurrence is fine via Google Calendar API)
- Offline support

## Decisions

### 1. Next.js App Router with Server Actions and Route Handlers

**Decision**: Use Next.js App Router with Route Handlers for the streaming chat API endpoint.

**Rationale**: App Router provides native support for streaming via `ReadableStream` and is the standard for new Next.js projects. Route Handlers give fine-grained control over the SSE/streaming response format needed by the agentic loop.

**Alternatives considered**:
- Pages Router: Legacy; lacks native streaming ergonomics
- Separate Express backend: Unnecessary complexity for a single-app deployment

### 2. Direct Anthropic SDK Integration

**Decision**: Use the official `@anthropic-ai/sdk` for Node.js, calling the Anthropic API directly from Next.js API routes.

**Rationale**: Direct integration minimizes operational overhead (no need for a Python sidecar like LiteLLM) and keeps the deployment simple, especially for single-developer MVP environments on serverless platforms like Vercel.

**Alternatives considered**:
- LiteLLM proxy: Great for normalizing APIs, but running a Python proxy adds significant deployment and operational complexity.
- Vercel AI SDK: Good streaming support but abstracts away tool-call control needed for agentic loops. We need fine-grained control over the tool-call → confirmation → resume cycle.

### 3. Agentic Loop Architecture

**Decision**: Implement a server-side agentic loop in the chat API route that:
1. Sends user message + conversation history to LLM
2. If LLM returns tool calls → execute tools server-side
3. If a tool requires user confirmation → stream a `confirmation_request` event to the client, pause the loop, and wait for the user's response via a follow-up request
4. Feed tool results back to the LLM and continue until the LLM produces a final text response
5. Stream all intermediate states (thinking, tool calls, results, final text) to the client

**Rationale**: This keeps the agentic logic server-side where it can access secrets and APIs, while giving the client visibility into each step via streaming. The confirmation pause/resume is modeled as a conversation state rather than a WebSocket, keeping the architecture stateless between requests.

**Alternatives considered**:
- Client-side orchestration: Exposes API keys, harder to secure
- WebSocket-based: More complex infra, harder to deploy on serverless (Vercel)

### 4. User Confirmation Modal System

**Decision**: Model confirmations as a special message type in the conversation. When the AI needs user input:
- The server streams a JSON event with type `confirmation_request` containing a question, options (array of choices), and a flag for whether free-form input is allowed
- The client renders a modal/inline confirmation UI using ShadCN Dialog/AlertDialog
- The user's response is sent as the next message with a `confirmation_response` metadata tag
- The server resumes the agentic loop with the user's choice

**Rationale**: This mirrors the pattern used in IDE AI chats (like Copilot). Modeling it as conversation messages means it naturally persists in history and the LLM can reference past confirmations.

### 5. Google Calendar Batch API

**Decision**: Use Google Calendar's batch HTTP endpoint (`https://www.googleapis.com/batch/calendar/v3`) for bulk operations. When the agentic loop identifies multiple events to create/edit, collect them and execute as a single batch request.

**Rationale**: Google's batch API allows up to 50 requests per batch call, significantly reducing API quota usage and latency. This directly addresses the requirement to minimize credit/quota usage.

**Alternatives considered**:
- Sequential API calls: Simpler but wastes quota and is slower
- Google's `googleapis` Node.js SDK batch support: The SDK's batch support is limited; raw HTTP batch requests give more control

### 6. Database Schema (Prisma + PostgreSQL)

**Decision**: Use Prisma with PostgreSQL. Core models:
- `Conversation`: id, title, createdAt, updatedAt
- `Message`: id, conversationId, role (user/assistant/system/tool), content, metadata (JSON), createdAt
- `CalendarAccount`: id, provider, accessToken, refreshToken, email, isDefault
- `UserPreference`: id, key, value (for default calendar, timezone, etc.)

**Rationale**: Prisma provides type-safe database access with Zod integration for validation. PostgreSQL handles JSON columns well for message metadata. Keeping conversations in the DB enables history, context retrieval, and potential future features.

### 7. Context Management Strategy

**Decision**: Implement a sliding window + summarization approach:
- Keep the last N messages in full detail
- For older messages, store a compressed summary
- Tool call results are stored but can be truncated in context (keep only the relevant output)
- Use Zod schemas to validate context payloads before sending to LLM

**Rationale**: Claude's context window is large but not infinite. For long scheduling sessions, we need to manage tokens. Summarization preserves intent without blowing the context budget.

### 8. Project Structure

**Decision**: Use `src/` directory with clear module boundaries:
```
src/
  app/                    # Next.js App Router pages + API routes
    api/chat/             # Chat streaming endpoint
    api/calendar/         # Calendar operations
    api/auth/             # Google OAuth callbacks
    (chat)/               # Chat page group
  components/             # ShadCN + custom components
    ui/                   # ShadCN primitives
    chat/                 # Chat-specific components
    confirmation/         # Confirmation modal components  
  lib/                    # Core business logic
    ai/                   # Agent loop, tool definitions, context management
    calendar/             # Google Calendar client, batch operations
    db/                   # Prisma client, queries
  types/                  # Shared Zod schemas and TypeScript types
  prisma/                 # Prisma schema and migrations
```

**Rationale**: Clear separation between UI, API, and business logic. The `lib/ai/` module encapsulates the agentic loop so it can be tested independently of the HTTP layer.

## Risks / Trade-offs

- **[Google OAuth token management]** → Refresh tokens can expire or be revoked. Mitigation: Implement token refresh logic in the calendar client; surface clear errors when re-auth is needed.

- **[Streaming + confirmation interruption complexity]** → Pausing an agentic loop mid-stream for user confirmation adds state management complexity. Mitigation: Model the pause as a normal conversation turn; the server is stateless between requests. The conversation state (including pending tool calls) is persisted in the message history.

- **[Batch API limitations]** → Google batch API has a 50-request limit and doesn't support all endpoints. Mitigation: Implement fallback to sequential calls for edge cases; validate batch size before sending.

- **[Token cost for long sessions]** → Extended scheduling sessions may accumulate large context. Mitigation: Context windowing and summarization strategy (Decision #7). Monitor token usage and add warnings.

- **[Single-user assumption]** → No auth system means anyone with access to the URL can use the app. Mitigation: Acceptable for MVP; document as a known limitation. Auth can be added later without major architectural changes.

## Open Questions

- What is the optimal context window size (number of messages) before summarization kicks in? Needs empirical testing with typical scheduling conversations.
- Should calendar event confirmations be batched (show all proposed events at once) or shown one-by-one? Likely batched for better UX, but needs design iteration.
