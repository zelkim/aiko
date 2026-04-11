## Why

The current calendar agent is a single monolithic `ToolLoopAgent` with all tools available at once. This causes routing failures — the model calls the wrong tools for the situation (e.g. `prepare_event_draft` during an edit, asking the user for an event ID instead of calling `list_events`). There is no code-level enforcement of flows. By classifying intent first and dispatching to specialized agents, each agent only has access to the tools relevant to its flow — the wrong tool physically cannot be called.

## What Changes

- Add an intent classifier that runs before the agent on every POST, returning one of: `CREATE`, `EDIT`, `DELETE`, `CHAT`, `CONTINUE`
- Replace the single monolithic agent with four specialized agents, each with a narrow tool set and focused system prompt:
  - **CREATE agent**: `prepare_event_draft` → `create_events`
  - **EDIT agent**: `list_events` (if needed) → `edit_event`
  - **DELETE agent**: `list_events` → `delete_event`
  - **CHAT agent**: no tools — answers questions about the chatbot's capabilities using a string context
- Add `CONTINUE` intent: detects when a POST is a resumption of an approval flow mid-stream and re-routes to the originating agent type
- Remove `prepare_edit_draft` tool — EDIT agent handles missing field collection conversationally, with `normalizeToRfc3339` moved inline into `edit_event.execute()`
- Multi-intent messages (e.g. "add X and delete Y"): classify as primary intent, defer second action to next turn
- `edit_event` wrapper switched from `events.update` (PUT, full replace) to `events.patch` (partial update) — **already done**, confirmed working

## Capabilities

### New Capabilities

- `intent-classifier`: Lightweight `generateObject` call using claude-haiku that reads the full message history and returns a structured `{ intent, continuationOf? }` object before the agent runs
- `create-agent`: Specialized ToolLoopAgent for event creation. Tools: `prepare_event_draft`, `create_events`. Returns created event IDs in result for downstream edits
- `edit-agent`: Specialized ToolLoopAgent for event editing. Tools: `list_events`, `edit_event`. Handles missing field collection conversationally; no draft tool
- `delete-agent`: Specialized ToolLoopAgent for event deletion. Tools: `list_events`, `delete_event`
- `chat-agent`: Specialized ToolLoopAgent with no tools. Answers questions about the chatbot's capabilities using a hardcoded string context. Refuses out-of-scope questions
- `continue-routing`: Logic in the route handler that detects `CONTINUE` intent and maps it back to the correct specialized agent by inspecting prior tool call history

### Modified Capabilities

- `calendar-event-draft-flow`: `prepare_edit_draft` tool is removed. The EDIT agent now collects missing fields conversationally instead of through a draft tool. `create_events` return shape changes to include `created: [{ id, summary }]` array (already implemented)

## Impact

- `src/lib/agent/calendar-agent.ts` — major refactor: split into multiple agent factory functions, add intent classifier
- `src/app/api/chat/route.ts` — add classify step before agent dispatch
- `src/lib/calendar/wrapper.ts` — already patched (events.patch), no further changes
- New dependency: `generateObject` from `ai` (already available)
- No schema or API contract changes visible to the frontend
- The approval modal flow (`needsApproval`, `addToolApprovalResponse`) is unchanged
