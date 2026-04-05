import { Server as SocketIOServer, Socket } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { AgentOrchestrator, ConversationMessage } from '../agent/AgentOrchestrator'
import { buildSystemPrompt } from '../prompts/base-system-prompt'
import { SOCKET_EVENTS } from '@servify/shared-types'

const MAX_HISTORY = 20
const HISTORY_TTL = 60 * 60 * 24 // 24h in Redis

export function setupChatHandler(io: SocketIOServer, prisma: PrismaClient, redis: Redis) {
  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.auth?.userId as string | undefined
    const locale = (socket.handshake.auth?.locale as string) ?? 'en'

    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, async (data: { message: string; ticketId?: string }) => {
      try {
        // Emit typing indicator
        socket.emit(SOCKET_EVENTS.CHAT_AGENT_TYPING, { typing: true })

        // Get or create ticket
        let ticketId = data.ticketId
        if (!ticketId) {
          const ticket = await prisma.supportTicket.create({
            data: {
              userId,
              channel: 'CHAT',
              status: 'OPEN',
              priority: 'MEDIUM',
              subject: data.message.slice(0, 100),
              aiHandled: true,
              escalatedToHuman: false,
            },
          })
          ticketId = ticket.id
          socket.emit('chat:ticket_created', { ticketId, ticketNumber: ticket.ticketNumber })
        }

        // Persist user message
        await prisma.ticketMessage.create({
          data: { ticketId, role: 'user', content: data.message },
        })

        // Load conversation history from Redis
        const historyKey = `chat:history:${ticketId}`
        const historyJson = await redis.get(historyKey)
        const conversationHistory: ConversationMessage[] = historyJson ? JSON.parse(historyJson) : []

        // Build user context
        let userContext
        if (userId) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { _count: { select: { bookings: true } } },
          })
          if (user) {
            userContext = {
              name: `${user.firstName} ${user.lastName}`,
              email: user.email,
              bookingCount: user._count.bookings,
            }
          }
        }

        // Get active booking context
        let activeBooking
        if (userId) {
          const booking = await prisma.booking.findFirst({
            where: {
              customerId: userId,
              status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
            },
            include: { service: { include: { translations: { where: { locale } } } } },
            orderBy: { scheduledAt: 'asc' },
          })
          if (booking) {
            activeBooking = {
              bookingNumber: booking.bookingNumber,
              status: booking.status,
              service: booking.service.translations[0]?.name ?? booking.service.slug,
              scheduledAt: booking.scheduledAt.toLocaleString(),
            }
          }
        }

        const systemPrompt = buildSystemPrompt({
          channel: 'chat',
          locale,
          user: userContext,
          activeBooking,
        })

        const orchestrator = new AgentOrchestrator(prisma, 'chat')
        const response = await orchestrator.processMessage({
          conversationHistory,
          newUserMessage: data.message,
          systemPrompt,
          userId,
          ticketId,
        })

        // Update history in Redis
        const updatedHistory: ConversationMessage[] = [
          ...conversationHistory,
          { role: 'user', content: data.message },
          { role: 'assistant', content: response.message },
        ].slice(-MAX_HISTORY)

        await redis.setex(historyKey, HISTORY_TTL, JSON.stringify(updatedHistory))

        // Stop typing indicator
        socket.emit(SOCKET_EVENTS.CHAT_AGENT_TYPING, { typing: false })

        // Send response
        socket.emit(SOCKET_EVENTS.CHAT_RESPONSE, {
          message: response.message,
          ticketId,
          escalated: response.escalated,
        })

        if (response.escalated) {
          socket.emit(SOCKET_EVENTS.CHAT_ESCALATED, {
            message: 'You are being connected to a human agent.',
          })
          // Join escalation room for human agent handoff
          socket.join(`escalated:${ticketId}`)
        }
      } catch (error) {
        console.error('Chat handler error:', error)
        socket.emit(SOCKET_EVENTS.CHAT_AGENT_TYPING, { typing: false })
        socket.emit(SOCKET_EVENTS.CHAT_RESPONSE, {
          message: "I'm sorry, I'm having trouble right now. Please try again or contact support.",
          escalated: false,
        })
      }
    })

    socket.on('chat:feedback', async (data: { ticketId: string; messageId?: string; helpful: boolean }) => {
      // Update last AI interaction
      const lastInteraction = await prisma.aIInteraction.findFirst({
        where: { ticketId: data.ticketId },
        orderBy: { createdAt: 'desc' },
      })
      if (lastInteraction) {
        await prisma.aIInteraction.update({
          where: { id: lastInteraction.id },
          data: { wasHelpful: data.helpful },
        })
      }
    })

    socket.on('disconnect', () => {
      // Cleanup if needed
    })
  })
}
