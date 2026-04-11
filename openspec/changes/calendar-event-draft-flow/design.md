## Context

The calendar chat agent uses `streamText` with `create_events`, `edit_event`, and `delete_event` tools, all gated by `needsApproval: true`. The approval modal is currently shown immediately when the model calls a mutation tool — meaning the model may call it before gathering all required fields, resulting in guessed/placeholder values in the confirmation.

The system prompt currently uses natural language instructions to tell the model to ask questions first. This is fragile: the model can skip the gathering phase, especially when the user's message implies intent without providing details.

## Goals / Non-Goals

**Goals:**
- Enforce field collection in TypeScript code, not solely in the system prompt
- Build the Google Calendar `requestBody` incrementally across conversation turns — treating it as a transaction
- Prevent `create_events` / `edit_event` from being called until all required fields are present
- Keep the pattern stateless — no database, no session storage; state lives in conversation history (tool call + result pairs visible to the model)
- Keep the existing `useChat` + approval modal flow unchanged on the frontend

**Non-Goals:**
- A full state machine engine or graph-based workflow (LangGraph-style)
- Persisted draft state across browser sessions or page reloads
- Multi-event batch drafting (each event drafted separately before batching)
- Modifying the frontend in any way

## Decisions

### 1. Stateless draft validator tools, not a state store

**Decision**: Introduce `prepare_event_draft` and `prepare_edit_draft` as plain tools with `execute` functions that validate partial input and return `{ complete, collected, missing }`.

**Rationale**: The AI SDK already persists tool call inputs and results in conversation history. The model sees every prior `prepare_event_draft` call and its result in context. We don't need a state store — the conversation history IS the state. Each call to the draft tool receives whatever fields the model has gathered so far, validates them, and tells the model what's still missing.

**Alternative considered**: Server-side session state (e.g., in Redis or in-memory Map keyed by session ID). Rejected: unnecessary complexity; the conversation history already provides the required context at no cost.

### 2. Draft tool returns the ready-to-use events array on completion

**Decision**: When all required fields are present, `prepare_event_draft` returns `{ complete: true, events: [...] }` with the fully formed event objects — ready to be passed directly to `create_events`.

**Rationale**: Reduces the model's reasoning burden for the final step. It just needs to call `create_events` with the `events` it received, rather than re-constructing the payload.

### 3. Completeness guard inside `create_events` and `edit_event`

**Decision**: The mutation tools validate that all required fields are present on their inputs. If called with incomplete data (e.g., missing `startDatetime`), they return an error string instead of executing.

**Rationale**: Defense-in-depth. The draft tools provide the primary enforcement, but the guard ensures the model can't bypass them — whether through misuse or model error. The error message instructs the model to use the draft tool first.

### 4. System prompt updated to reference the draft tools explicitly

**Decision**: Update the system prompt rule set to name `prepare_event_draft` and `prepare_edit_draft` as the required first step for creating and editing events.

**Rationale**: The system prompt + code enforcement together are more reliable than either alone. The prompt sets intent; the tool enforces it.

## Risks / Trade-offs

- **Model calls `create_events` in the same turn as the final draft call** → Mitigation: The draft tool's `complete: true` response includes explicit text: `"All required fields collected. Now call create_events with the events array above."` This nudges single-step sequencing. The guard in `create_events` also catches any incomplete data.

- **Model loops on draft tool indefinitely** → Low risk: The model terminates when it returns a text response after a `complete: true` draft result. The `maxSteps` default (20) provides a hard ceiling.

- **State loss on page reload** → Accepted trade-off. The conversation resets on reload anyway in the current implementation. Not in scope.

## Migration Plan

1. Add `prepare_event_draft` and `prepare_edit_draft` tools to `route.ts`
2. Add completeness guards to `create_events` and `edit_event` execute functions
3. Update system prompt to reference the draft tools
4. No frontend changes needed
5. No rollback risk — purely additive to the existing tool set

## Open Questions

- Should `prepare_event_draft` support partial multi-event batches (e.g., collecting details for 3 events one by one before a single `create_events` call)? Currently out of scope — each event is drafted and created individually.
