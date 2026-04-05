import { PrismaClient } from '@prisma/client'

export async function createTicketTool(
  input: {
    subject: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    booking_id?: string
  },
  userId: string | undefined,
  channel: 'chat' | 'email' | 'voice',
  prisma: PrismaClient
): Promise<object> {
  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      bookingId: input.booking_id,
      channel: channel.toUpperCase() as any,
      status: 'OPEN',
      priority: input.priority.toUpperCase() as any,
      subject: input.subject,
      aiHandled: true,
      escalatedToHuman: false,
      messages: {
        create: {
          role: 'assistant',
          content: input.description,
          isInternal: true,
        },
      },
    },
  })

  return {
    success: true,
    ticket_number: ticket.ticketNumber,
    message: `A support ticket has been created (${ticket.ticketNumber}). You'll receive updates via email.`,
  }
}
