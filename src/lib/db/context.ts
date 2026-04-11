import { getConversation } from './conversations';

export async function getContextWindow(conversationId: string, maxMessages = 10) {
  const conversation = await getConversation(conversationId);
  if (!conversation) return [];

  const messages = conversation.messages;

  // Simple context window: Return the last `maxMessages` messages.
  // In a real production LLM agent we would summarize the older ones.
  if (messages.length <= maxMessages) {
    return messages;
  }

  const recentMessages = messages.slice(-maxMessages);
  
  // Optionally include a synthesized "summary" message if desired, 
  // but for now, we'll just truncate.
  return recentMessages;
}
