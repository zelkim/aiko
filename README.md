# Aiko — AI Calendar Chatbot

**⚠️ IMPORTANT: THIS README IS THE MAIN SOURCE OF TRUTH AND MUST BE UPDATED WHENEVER NEW CHANGES OR FEATURES ARE IMPLEMENTED.**

## Project Overview

Aiko is an agentic AI scheduling assistant that interprets natural language to manage Google Calendar events. It features an intent-classified multi-agent architecture, inline visual event approval via an interactive timegrid, streaming responses, and an OAuth-based auth flow — all built on Next.js 16 with the Vercel AI SDK v6.

### Key Capabilities

- **Intent-Classified Routing**: Every user message is classified (CREATE / EDIT / DELETE / CHAT / CONTINUE) by a lightweight LLM call, then dispatched to a purpose-built agent.
- **Specialized Agents**: Four `ToolLoopAgent` instances — Create, Edit, Delete, Chat — each with minimal, focused tool sets.
- **Inline Timegrid Approval**: Before any mutation executes, the UI renders an `EventApprovalCard` with a `CalendarTimeGrid` (from `@zelkim/zui`) showing the affected time slots. The user confirms or cancels inline — no modal.
- **Streaming Responses**: Real-time server-side streaming of tokens and tool call/result events via `createAgentUIStreamResponse`.
- **Batch & Recurring Events**: Supports creating multiple events in one request and RRULE-based recurrence.
- **Google OAuth via better-auth**: Sign-in with Google, calendar scope tokens managed through `better-auth` + Prisma.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| AI SDK | [Vercel AI SDK v6](https://sdk.vercel.ai/) (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/react`) |
| LLM | Anthropic Claude 3 Haiku |
| Calendar | [Google Calendar API v3](https://developers.google.com/calendar/api) via `googleapis` |
| Auth | [better-auth](https://www.better-auth.com/) with Prisma adapter + Google OAuth |
| Database | PostgreSQL + [Prisma ORM](https://www.prisma.io/) |
| UI | [ShadCN UI](https://ui.shadcn.com/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/) |
| Timegrid | [`@zelkim/zui`](https://www.npmjs.com/package/@zelkim/zui) — CalendarTimeGrid components |
| Validation | [Zod](https://zod.dev/) |

## Architecture Overview

```
User Message
    │
    ▼
┌──────────────────┐
│  Intent Classifier│  (Claude 3 Haiku · generateObject)
│  + Recent Activity│  Deterministic CONTINUE detection
└────────┬─────────┘
         │ intent
         ▼
┌────────────────────────────────────────────┐
│          Route Handler (POST /api/chat)     │
│  Dispatches to specialized ToolLoopAgent    │
└────────┬───────────┬───────────┬───────────┘
         │           │           │
    ┌────▼───┐  ┌────▼───┐  ┌───▼────┐  ┌────────┐
    │ Create │  │  Edit  │  │ Delete │  │  Chat  │
    │ Agent  │  │ Agent  │  │ Agent  │  │ Agent  │
    └────┬───┘  └────┬───┘  └───┬────┘  └────────┘
         │           │          │
         ▼           ▼          ▼
   needsApproval tools → streamed to client
         │
         ▼
┌──────────────────────────────┐
│  EventApprovalCard (inline)  │
│  CalendarTimeGrid from @zelkim/zui │
│  ✓ Confirm  /  ✗ Cancel     │
└──────────────┬───────────────┘
               │ addToolApprovalResponse
               ▼
      Google Calendar API
```

### Intent Classification (`classifier.ts`)

1. **CONTINUE** — detected deterministically (no LLM call) by scanning the last assistant message for any tool part with `state === "approval-requested"`.
2. **CREATE / EDIT / DELETE / CHAT** — classified via `generateObject` with Claude 3 Haiku. A `buildRecentActivityContext()` helper injects recent tool results into the system prompt to disambiguate follow-up corrections (e.g. "actually make it 2 hours") from new creations.

### Specialized Agents

| Agent | Tools | Approval Required |
|---|---|---|
| **Create** | `prepare_event_draft`, `create_events` | `create_events` |
| **Edit** | `list_events`, `edit_event` | `edit_event` |
| **Delete** | `list_events`, `delete_event` | `delete_event` |
| **Chat** | *(none)* | — |

- All mutation tools use `needsApproval: true`, which pauses the agent loop and streams an approval request to the client.
- The client renders an `EventApprovalCard` with a timegrid visualization, then calls `addToolApprovalResponse({ id, approved })` to resume.
- Create agent uses a two-step flow: `prepare_event_draft` validates/collects fields → `create_events` executes.
- Edit agent uses `events.patch` (partial update) — only changed fields are sent.
- All datetimes are normalized to RFC 3339 with `Asia/Manila (+08:00)` timezone.

### Inline Timegrid Approval (`EventApprovalCard.tsx`)

Instead of a modal confirmation dialog, all mutation tools render an inline card with:
- A `CalendarTimeGrid` showing the affected day(s) and time slot(s)
- Recurring events expand to show individual occurrences
- **Create**: shows new event(s) on the grid
- **Edit**: shows both current and new time slots (if times changed)
- **Delete**: shows the event being removed
- Confirm / Cancel buttons that resolve the tool approval

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/route.ts   # better-auth catch-all handler
│   │   └── chat/route.ts            # Main chat endpoint — classifies & dispatches
│   ├── sign-in/page.tsx              # Google OAuth sign-in page
│   ├── globals.css                   # Tailwind v4 config, @source inline() safelist
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Home page (chat UI)
├── components/
│   ├── chat/
│   │   ├── ChatLayout.tsx            # Main chat interface with useChat hook
│   │   ├── EventApprovalCard.tsx     # Inline timegrid approval card
│   │   └── ConfirmationModal.tsx     # (deprecated — replaced by EventApprovalCard)
│   └── ui/                           # ShadCN UI primitives (button, dialog, input, scroll-area)
├── lib/
│   ├── agent/
│   │   ├── agents/
│   │   │   ├── create-agent.ts       # CREATE intent — prepare_event_draft + create_events
│   │   │   ├── edit-agent.ts         # EDIT intent — list_events + edit_event (PATCH)
│   │   │   ├── delete-agent.ts       # DELETE intent — list_events + delete_event
│   │   │   └── chat-agent.ts         # CHAT intent — no tools, capability Q&A
│   │   ├── classifier.ts             # Intent classification + recent activity context
│   │   ├── utils.ts                  # Shared: DEFAULT_TZ, datetimeWithTz schema, normalizeToRfc3339
│   │   ├── calendar-agent.ts         # (legacy single-agent, no longer used by route)
│   │   └── tools.ts                  # (legacy tools file)
│   ├── calendar/
│   │   ├── wrapper.ts                # Google Calendar API wrapper (CRUD + OAuth client)
│   │   └── batch.ts                  # Batch API utilities
│   ├── db/
│   │   ├── context.ts                # Conversation context management
│   │   └── conversations.ts          # Conversation CRUD
│   ├── auth.ts                       # better-auth server config (Google OAuth + Prisma)
│   ├── auth-client.ts                # better-auth client helpers
│   ├── prisma.ts                     # Prisma client singleton
│   └── utils.ts                      # General utilities (cn, etc.)
└── proxy.ts                          # Dev proxy configuration
```

## Setup Instructions

### 1. Requirements

- Node.js 18+
- PostgreSQL server (local or hosted)
- A Google Cloud Platform (GCP) account with the Calendar API enabled
- Anthropic API Key

### 2. Environment Variables

1. Copy the `.env.template` file to `.env`:
   ```bash
   cp .env.template .env
   ```
2. Fill in the required values:
   - `DATABASE_URL` — PostgreSQL connection string
   - `ANTHROPIC_API_KEY` — Anthropic API key (`sk-ant-xxx`)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — GCP OAuth 2.0 credentials
   - `BETTER_AUTH_URL` — Base URL for auth (e.g. `http://localhost:3000`)
   - `BETTER_AUTH_SECRET` — Random secret for session encryption

### 3. Installation

1. Install dependencies:
   ```bash
   npm install
   ```
2. Initialize the database:
   ```bash
   npx prisma migrate dev --name init
   # Or if migrations aren't set up: npx prisma db push
   ```

### 4. Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to launch the chatbot.

## Notable Implementation Details

- **Tailwind v4 + `@zelkim/zui`**: The Oxide engine doesn't scan `.js`/`.cjs` files in `node_modules`. Library classes are safelisted via `@source inline()` in `globals.css`.
- **`ToolLoopAgent`**: Each agent runs an autonomous tool loop — the LLM decides when to call tools and when to respond, with the SDK handling the multi-turn orchestration.
- **`events.patch` for edits**: Only the fields the user asked to change are sent to the Google API — no overwriting of untouched fields.
- **Deterministic CONTINUE detection**: Approval resumption skips the LLM classifier entirely by inspecting message parts for `state === "approval-requested"`.
- **Display-only schema fields**: `edit_event` and `delete_event` schemas include `current*` fields populated from `list_events` results, used solely by the approval card to show context — they are not sent to the Google API.
