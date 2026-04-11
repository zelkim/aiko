import { createAgentUIStreamResponse } from 'ai';
import { auth } from '@/lib/auth';
import { classifyIntent } from '@/lib/agent/classifier';
import { createCreateAgent } from '@/lib/agent/agents/create-agent';
import { createEditAgent } from '@/lib/agent/agents/edit-agent';
import { createDeleteAgent } from '@/lib/agent/agents/delete-agent';
import { createChatAgent } from '@/lib/agent/agents/chat-agent';

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages } = await req.json();

  // Classify intent before constructing the agent
  let classified;
  try {
    classified = await classifyIntent(messages);
    console.log(`[classifier] intent: ${classified.intent}${classified.continuationOf ? ` (continuing: ${classified.continuationOf})` : ''}`);
  } catch (err) {
    console.error('[classifier] error, falling back to CHAT:', err);
    classified = { intent: 'CHAT' as const };
  }

  // Dispatch to the correct specialized agent
  const resolvedIntent = classified.intent === 'CONTINUE' ? classified.continuationOf! : classified.intent;
  const agent =
    resolvedIntent === 'CREATE' ? createCreateAgent(req.headers) :
    resolvedIntent === 'EDIT'   ? createEditAgent(req.headers) :
    resolvedIntent === 'DELETE' ? createDeleteAgent(req.headers) :
    createChatAgent(req.headers);

  try {
    return createAgentUIStreamResponse({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      agent: agent as any,
      uiMessages: messages,
      onStepFinish: ({ stepNumber, toolCalls, toolResults, finishReason, usage }) => {
        console.log(`[agent:${resolvedIntent}] step ${stepNumber} | finish: ${finishReason} | tokens: ${usage?.totalTokens ?? '?'}`);
        if (toolCalls?.length) {
          for (const tc of toolCalls) {
            console.log(`[agent]   tool_call: ${tc.toolName}`, JSON.stringify(tc.input));
          }
        }
        if (toolResults?.length) {
          for (const tr of toolResults) {
            console.log(`[agent]   tool_result: ${tr.toolName}`, JSON.stringify(tr.output));
          }
        }
      },
    });
  } catch (err) {
    console.error('[agent] stream error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal agent error', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

