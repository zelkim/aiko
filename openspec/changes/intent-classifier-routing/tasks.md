## 1. Shared Utilities

- [x] 1.1 Move `normalizeToRfc3339`, `DEFAULT_TZ`, and `DEFAULT_TZ_OFFSET` to a shared utility file `src/lib/agent/utils.ts` so all agent files can import them
- [x] 1.2 Create `classifyIntent(messages: UIMessage[]): Promise<{ intent: "CREATE" | "EDIT" | "DELETE" | "CHAT" | "CONTINUE", continuationOf?: "CREATE" | "EDIT" | "DELETE" }>` using `generateObject` with claude-3-haiku — detect `CONTINUE` by inspecting last assistant message for `state === "approval-requested"` tool parts before calling the LLM

## 2. Specialized Agent Factories

- [x] 2.1 Create `createCreateAgent(reqHeaders)` — tools: `prepare_event_draft`, `create_events` only; focused system prompt for event creation
- [x] 2.2 Create `createEditAgent(reqHeaders)` — tools: `list_events`, `edit_event` only; inline `normalizeToRfc3339` in `edit_event.execute()`; system prompt instructs conversational field collection and using event IDs from history
- [x] 2.3 Create `createDeleteAgent(reqHeaders)` — tools: `list_events`, `delete_event` only; system prompt instructs finding event ID via `list_events` before deleting
- [x] 2.4 Create `createChatAgent()` — empty tools map; system prompt includes hardcoded capability context string; declines out-of-scope questions
- [x] 2.5 Remove `prepare_edit_draft` tool from the codebase entirely
- [x] 2.6 Remove the old monolithic `createCalendarAgent` function

## 3. Route Update

- [x] 3.1 In `route.ts`, call `classifyIntent(messages)` before `createAgentUIStreamResponse` and await the result
- [x] 3.2 Dispatch to the correct agent factory based on the classified intent (`CREATE` → `createCreateAgent`, `EDIT` → `createEditAgent`, `DELETE` → `createDeleteAgent`, `CHAT` → `createChatAgent`, `CONTINUE` → re-create originating agent from `continuationOf`)
- [x] 3.3 Wrap classifier call in try/catch — on error, log and fall back to `createChatAgent()`
- [x] 3.4 Log classified intent in `onStepFinish` alongside the existing step/token logging

## 4. Manual Testing

- [ ] 4.1 CREATE flow: "can you schedule my CCPROG1 class every Tuesday and Friday at 4pm for 1.5 hours" → verify one round of questions, then approval modal → event created with correct recurrence and timezone
- [ ] 4.2 EDIT flow using history ID: after creating an event, say "oh change it to 1.5 hours" → verify agent uses ID from create result, does not call `list_events`, partial patch only updates end time
- [ ] 4.3 EDIT flow via list_events: in a fresh conversation say "change my CCPROG1 end time to 5:30pm" → verify agent calls `list_events`, finds the event, patches only end time
- [ ] 4.4 DELETE flow: "delete my CCPROG1 class" → verify agent calls `list_events`, identifies event, shows approval modal, deletes on confirm
- [ ] 4.5 CHAT flow: "what can you do?" → verify agent answers from capability context, no tool calls; "what's 2+2?" → verify agent declines politely
- [ ] 4.6 CONTINUE flow: trigger a CREATE approval modal, click Confirm → verify the CREATE agent resumes, event is created
- [ ] 4.7 CONTINUE flow: trigger a DELETE approval modal, click Deny → verify the DELETE agent handles the denial gracefully
