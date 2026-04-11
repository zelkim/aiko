## Context

The calendar chatbot runs as a single `ToolLoopAgent` with all tools available to the model at once. The model is directed by a 10-rule system prompt to call tools in the right order. This approach has produced repeated routing failures:

- Model calls `prepare_event_draft` when the user asks to edit an existing event
- Model asks the user for an event ID instead of calling `list_events`
- Model adds a conversational "shall I proceed?" turn before `create_events`, duplicating the approval gate
- No way to trace which "flow" is active at any point in a conversation

The core issue: prompt-enforced routing is advisory. The model can and does deviate, especially across multi-turn conversations where earlier instructions drift out of attention.

**Current stack:** Next.js App Router, Vercel AI SDK v6 (`ToolLoopAgent`, `createAgentUIStreamResponse`), Anthropic claude-3-haiku, Google Calendar API, Zod schemas.

## Goals / Non-Goals

**Goals:**
- Code-enforce which tools are available per user intent — the wrong tool cannot be called because it does not exist in the active agent
- Classify intent before the agent runs, using a fast `generateObject` call with haiku
- Add a `CHAT` agent that answers capability questions with no tool access
- Add `CONTINUE` intent to correctly re-route after an approval modal fires a new POST
- Remove `prepare_edit_draft` — EDIT agent handles field collection conversationally
- Each specialized agent has a focused, short system prompt (not a 10-rule manifesto)

**Non-Goals:**
- Per-user timezone — defaulting to Asia/Manila remains; configurable timezone is a separate change
- Multi-intent resolution in a single turn — defer the second intent to the next turn
- LangGraph or stateful workflow orchestration — ToolLoopAgent per turn is sufficient
- RAG or external knowledge retrieval for the CHAT agent — string context only for now
- Persistent intent state across sessions — intent is reclassified each POST from message history

## Decisions

### Decision 1: `generateObject` classifier before agent dispatch (not a tool call)

**Chosen:** Run `generateObject` with haiku before `createAgentUIStreamResponse`. The route awaits the classified intent, selects the matching agent factory, then streams the response.

**Alternative considered — classify as first tool call (Option C):** The model calls `classify_intent` as step 1, execute() returns allowed tools as a hint. Rejected because: the model still has all tools loaded and can deviate from the hint. This is prompt-enforcement in disguise, not code-enforcement.

**Why Option A wins:** The classified intent gates which agent instance is created. The agent is constructed with a fixed tools map. There is no code path by which the EDIT agent can call `prepare_event_draft` — the key does not exist in its `tools` object.

**Latency cost:** ~100ms for the classify call. Acceptable given that the stream itself takes 500ms–2s for most turns.

### Decision 2: Remove `prepare_edit_draft`, keep `prepare_event_draft`

**`prepare_event_draft` stays** because `create_events` uses strict Zod validation (`datetimeWithTz` refine). If the model passes a datetime without timezone, Zod rejects before `execute` runs — the SDK sends a silent error, the model retries in a loop, and the UI hangs. `prepare_event_draft` provides a loose-input entry point that normalizes datetimes via `normalizeToRfc3339()` before committing to the strict schema.

**`prepare_edit_draft` is removed** because `edit_event` uses `events.patch` (partial update). Missing fields just don't get sent — nothing is overwritten. The EDIT agent collects missing required fields conversationally (asks user, gets answer, calls `edit_event`). `normalizeToRfc3339()` is moved inline into `edit_event.execute()`.

### Decision 3: `CONTINUE` intent maps back to originating agent by inspecting history

When the user clicks Confirm in the approval modal, the client fires a new POST with the full message history including an `approval-requested` tool part. The classifier detects this pattern and returns `{ intent: "CONTINUE", continuationOf: "CREATE" | "EDIT" | "DELETE" }`. The route creates the same agent that was running before so it can process the approval response and resume.

**Alternative considered:** Always re-route CONTINUE to a generic "approval handler" agent. Rejected — the approval-handling agent would need all tools regardless, defeating the purpose of specialization.

### Decision 4: CHAT agent uses hardcoded capability string, no tools

The CHAT agent's system prompt includes a plain-text description of what the calendar chatbot can do (list events, create, edit, delete, recurrence, batch creation). It has no tools. It refuses questions outside this domain. This is the simplest possible implementation and avoids any risk of the CHAT agent accidentally mutating calendar data.

### Decision 5: Primary intent wins on multi-intent messages

"Add my CCPROG1 class and delete the old placeholder" → classifier returns `CREATE` (primary), agent tells user it will handle the second action after. This avoids the complexity of sequential multi-agent chaining in a single turn.

## Risks / Trade-offs

**Classification errors → wrong agent → confusing response**
→ Mitigation: Classifier prompt includes the full message history (not just last message). Confidence field logged server-side. On misclassification, the user's next message reclassifies correctly — no state is corrupted, just a wasted turn.

**`CONTINUE` intent detection is fragile if message structure changes**
→ Mitigation: Inspect `messages` for any part with `state === "approval-requested"` in the last assistant message. This is an SDK contract (not user-generated), unlikely to change unexpectedly.

**100ms classify latency is visible on every turn**
→ Mitigation: Haiku is fast. Can be optimized later with a keyword pre-filter that skips the classify call for obvious patterns (e.g. if last message contains "approval" → CONTINUE directly).

**EDIT agent without `prepare_edit_draft` may loop on bad datetime input**
→ Mitigation: `normalizeToRfc3339()` inline in `edit_event.execute()`. On failure, execute returns `{ success: false, error }` — model reads it, asks user to clarify, retries. This is the same pattern that resolved the CREATE hang.

## Migration Plan

1. Refactor `calendar-agent.ts` — extract specialized agent factories, add classifier function
2. Update `route.ts` — add classify step, dispatch by intent
3. Delete `prepare_edit_draft` tool
4. Create spec files for each new capability
5. Test all five intents manually: CREATE, EDIT, DELETE, CHAT, CONTINUE (post-approval)
6. No frontend changes required — approval modal, `useChat`, streaming all unchanged

Rollback: revert `calendar-agent.ts` and `route.ts` to the monolithic agent. No data migrations involved.

## Open Questions

- Should the classifier's `confidence` score be used to fall back to CHAT when below a threshold (e.g. 0.4)? For now, always trust the classification.
- Should the CHAT agent's capability description be a constant in the file or read from a doc at startup? Start with inline constant; move to file if it grows large.
