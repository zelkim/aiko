## Why

We need an AI-powered calendar scheduling assistant that can handle complex, multi-action requests through natural conversation. Users currently manage calendar events manually across multiple calendars, which is tedious and error-prone. An agentic chatbot removes this friction by interpreting natural language ("create a meeting with John at 3:30 PM, and Jane at 4") and executing multiple calendar operations in a single interaction, with streaming responses and user confirmation for ambiguous actions.

## What Changes

- Scaffold a new Next.js application (greenfield) with Prisma ORM, Zod schema validation, and ShadCN UI
- Implement an agentic AI chat interface using Anthropic (Claude) directly as the LLM provider
- Build a streaming chat system so users see responses in real-time
- Create an internal AI tool-calling framework for calendar operations (create, edit, delete events) with multi-tool-call support per user message
- Implement a user confirmation modal system (similar to IDE AI chats) where the agent can ask the user structured questions with selectable choices or free-form input
- Integrate with Google Calendar API, including batch operations for bulk event creation/editing to minimize API credit usage
- Add calendar inference logic — when the target calendar isn't explicit in the user's prompt, the agent infers or asks for clarification
- Create a `.env.template` with documented instructions for generating required API keys
- Establish README as the single source of truth for the project, with a policy to update it with every change

## Capabilities

### New Capabilities
- `chat-interface`: Real-time streaming chat UI built with ShadCN components, handling message display, input, and loading states
- `ai-agent-core`: Agentic AI backbone using the Anthropic API directly — manages context, tool definitions, multi-step tool calling, and streaming responses
- `user-confirmation`: Modal system for the AI to ask structured questions to the user mid-conversation, with choice selection and free-form input support
- `calendar-integration`: Google Calendar API integration including OAuth, event CRUD, batch operations, and multi-calendar support
- `context-management`: Internal tooling for managing chat context, conversation history, and token-efficient context windowing
- `project-scaffold`: Next.js project setup with Prisma, Zod, ShadCN UI, env template, and README-as-source-of-truth policy

### Modified Capabilities
<!-- No existing capabilities to modify — this is a greenfield project. -->

## Impact

- **New codebase**: Entire Next.js application with `src/` directory structure
- **Dependencies**: next, react, prisma, @prisma/client, zod, @anthropic-ai/sdk, shadcn/ui, googleapis (Google Calendar), tailwindcss
- **External APIs**: Google Calendar API (OAuth 2.0 + batch endpoints), Anthropic API
- **Database**: PostgreSQL (via Prisma) for persisting conversations, user preferences, and calendar metadata
- **Environment**: Requires `ANTHROPIC_API_KEY`, Google OAuth credentials, database URL
- **Infrastructure**: Streaming via Server-Sent Events or similar mechanism from Next.js API routes
