## Why

The calendar agent currently shows the create/edit confirmation modal before gathering all required event details, leading to incomplete tool calls or the model guessing placeholder values. Users should be walked through a structured collection flow before any mutation is attempted.

## What Changes

- Introduce a `prepare_event_draft` tool that accumulates event fields across turns and validates completeness before allowing `create_events` to be called
- Introduce a `prepare_edit_draft` tool that accumulates edit fields before allowing `edit_event` to be called
- Remove the reliance on the system prompt alone for information-gathering discipline; enforce it in code via tool-level validation
- `create_events` and `edit_event` gain an internal guard that rejects calls with incomplete data, preventing the model from bypassing the draft tools

## Capabilities

### New Capabilities

- `event-draft-flow`: A two-phase transaction pattern for creating and editing calendar events. Phase 1 accumulates required fields via a draft tool returning `{ complete, collected, missing }`. Phase 2 commits via the existing mutation tools once the draft signals `complete: true`.

### Modified Capabilities

- (none — `create_events` and `edit_event` behaviorally unchanged from the user's perspective; the guard is an internal implementation detail)

## Impact

- `src/app/api/chat/route.ts` — new `prepare_event_draft` and `prepare_edit_draft` tools added; `create_events` and `edit_event` gain completeness guards
- No frontend changes required — flows over existing `useChat` + approval modal
- No new dependencies
