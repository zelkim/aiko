import { prisma } from "@/lib/prisma";

export async function createConversation(userId: string, title?: string) {
  return await prisma.conversation.create({
    data: { userId, title },
  });
}

export async function getConversation(id: string) {
  return await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
}

export async function listRecentConversations(userId: string, limit = 10) {
  return await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
}

export async function addMessage(conversationId: string, role: string, content: string, metadata?: any) {
  return await prisma.message.create({
    data: {
      conversationId,
      role,
      content,
      metadata,
    },
  });
}
