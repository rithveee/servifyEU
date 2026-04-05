import { PrismaClient } from '@prisma/client'

export async function escalateToHumanTool(
  input: {
    reason: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    summary?: string
  },
  userId: string | undefined,
  ticketId: string,
  prisma: PrismaClient
): Promise<object> {
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      escalatedToHuman: true,
      aiHandled: false,
      priority: input.priority.toUpperCase() as any,
      status: 'ESCALATED',
    },
  })

  await prisma.ticketMessage.create({
    data: {
      ticketId,
      role: 'assistant',
      content: `[ESCALATED TO HUMAN] Reason: ${input.reason}. Summary: ${input.summary ?? 'No summary provided.'}`,
      isInternal: true,
    },
  })

  const priorityMessages: Record<string, string> = {
    urgent: 'A senior agent will be with you in the next 5 minutes.',
    high: 'An agent will be with you within 15 minutes.',
    medium: 'An agent will be with you within 30 minutes.',
    low: 'An agent will follow up within 2 business hours.',
  }

  return {
    escalated: true,
    priority: input.priority,
    customerMessage: `I'm connecting you with a human agent now. ${priorityMessages[input.priority] ?? 'An agent will be with you shortly.'}`,
    summary: input.summary,
  }
}
