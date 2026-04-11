import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

export type Intent = 'CREATE' | 'EDIT' | 'DELETE' | 'CHAT' | 'CONTINUE';
export type ContinuationOf = 'CREATE' | 'EDIT' | 'DELETE';

export interface ClassifiedIntent {
  intent: Intent;
  continuationOf?: ContinuationOf;
}

const TOOL_TO_INTENT: Record<string, ContinuationOf> = {
  create_events: 'CREATE',
  edit_event: 'EDIT',
  delete_event: 'DELETE',
};

/**
 * Extract recent tool activity summary from message history to give the
 * classifier context about what operations were just performed.
 * Example: "Recently completed: create_events (success)"
 */
function buildRecentActivityContext(messages: any[]): string {
  const recentTools: string[] = [];

  for (const message of messages) {
    if (message.role !== 'assistant' || !message.parts) continue;
    for (const part of message.parts) {
      const type: string = part.type ?? '';
      if (!type.includes('tool')) continue;
      // Skip if no result yet (pending, running, or waiting for approval)
      if (!part.result) continue;
      if (part.state === 'approval-requested') continue;
      if (!part.toolName) continue;
      // Include the tool name and whether it succeeded
      const success =
        part.result?.success !== false && !part.result?.error;
      recentTools.push(`${part.toolName} (${success ? 'success' : 'failed'})`);
    }
  }

  if (recentTools.length === 0) return '';
  const last3 = recentTools.slice(-3);
  return `\n\nRecent tool activity (most recent last): ${last3.join(' → ')}.\nIf the user's message is a follow-up or correction to a recently completed operation (e.g. "oh actually", "make it", "change that to"), classify as EDIT rather than CREATE.`;
}

/**
 * Classify the user's intent from message history.
 *
 * CONTINUE is detected deterministically by inspecting the last assistant
 * message for any tool part with state === 'approval-requested'. This avoids
 * an LLM call for the approval resumption case.
 */
export async function classifyIntent(messages: any[]): Promise<ClassifiedIntent> {
  // Detect CONTINUE: look for approval-requested in the last assistant message
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  if (lastAssistant?.parts) {
    for (const part of lastAssistant.parts) {
      if (
        (part.type === 'dynamic-tool' || part.type?.startsWith('tool-')) &&
        part.state === 'approval-requested' &&
        part.toolName &&
        TOOL_TO_INTENT[part.toolName]
      ) {
        return { intent: 'CONTINUE', continuationOf: TOOL_TO_INTENT[part.toolName] };
      }
    }
  }

  // LLM classification for all other intents
  const recentActivity = buildRecentActivityContext(messages);
  const { object } = await generateObject({
    model: anthropic('claude-3-haiku-20240307'),
    schema: z.object({
      intent: z.enum(['CREATE', 'EDIT', 'DELETE', 'CHAT']),
    }),
    system: `You are an intent classifier for a Google Calendar chatbot.
Classify the user's most recent message into one of these intents:
- CREATE: user wants to add, schedule, or create a new calendar event
- EDIT: user wants to update, change, modify, move, or reschedule an existing event
- DELETE: user wants to remove, delete, or cancel an existing event
- CHAT: user is asking about what the chatbot can do, wants to VIEW/LIST/SEE their schedule or events, asking a general question, or the message is not clearly a calendar operation

When in doubt between CREATE and CHAT, pick CHAT.
Only classify as CREATE/EDIT/DELETE if the user is clearly requesting a calendar operation.
If create_events was recently completed and the user's message sounds like a correction or follow-up (e.g. "oh the class goes for 2 hours", "actually make it 1.5 hours", "it's supposed to be at 4pm"), classify as EDIT.${recentActivity}`,
    messages: messages.map((m: any) => ({
      role: m.role,
      content:
        typeof m.content === 'string'
          ? m.content
          : m.parts
              ?.filter((p: any) => p.type === 'text')
              .map((p: any) => p.text)
              .join(' ') ?? '',
    })),
  });

  return { intent: object.intent };
}
