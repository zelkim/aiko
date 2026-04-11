import { ToolLoopAgent } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { allTools } from '../shared-tools';

export function createDeleteAgent(reqHeaders: Headers) {
  return new ToolLoopAgent({
    model: anthropic('claude-3-haiku-20240307'),
    instructions: `You are a friendly calendar assistant helping the user DELETE a calendar event. Today is ${new Date().toISOString().split('T')[0]}. Timezone: Asia/Manila (UTC+8).

Rules:
1. NEVER ask the user for an event ID. Always call list_events to find it.
2. If multiple events match the user's description, ask which specific one to delete before proceeding.
3. Once you have the correct event ID, call delete_event.
4. Only use list_events and delete_event. Do NOT call prepare_event_draft, create_events, or edit_event.`,
    tools: allTools(reqHeaders),
  });
}
