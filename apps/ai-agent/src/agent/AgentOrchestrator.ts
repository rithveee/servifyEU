import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient } from '@prisma/client'
import { agentTools } from './ToolRegistry'
import { getBookingTool } from '../tools/getBookingTool'
import { cancelBookingTool } from '../tools/cancelBookingTool'
import { escalateToHumanTool } from '../tools/escalateToHumanTool'
import { searchKnowledgeBaseTool } from '../tools/searchKnowledgeBaseTool'
import { createTicketTool } from '../tools/createTicketTool'

export interface AgentResponse {
  message: string
  escalated: boolean
  escalationData?: object
  ticketNumber?: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

const MODEL = 'claude-sonnet-4-20250514'
const MAX_LOOPS = 5

export class AgentOrchestrator {
  private client: Anthropic
  private channel: 'chat' | 'email' | 'voice'

  constructor(
    private prisma: PrismaClient,
    channel: 'chat' | 'email' | 'voice' = 'chat'
  ) {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
    this.channel = channel
  }

  async processMessage(params: {
    conversationHistory: ConversationMessage[]
    newUserMessage: string
    systemPrompt: string
    userId?: string
    ticketId: string
  }): Promise<AgentResponse> {
    const startTime = Date.now()

    const messages: Anthropic.MessageParam[] = [
      ...params.conversationHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: params.newUserMessage },
    ]

    let currentMessages = messages
    let loopCount = 0
    let totalInputTokens = 0
    let totalOutputTokens = 0

    while (loopCount < MAX_LOOPS) {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: params.systemPrompt,
        tools: agentTools,
        messages: currentMessages,
      })

      totalInputTokens += response.usage.input_tokens
      totalOutputTokens += response.usage.output_tokens

      if (response.stop_reason === 'end_turn') {
        const textContent = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('')

        // Log interaction
        await this.logInteraction({
          ticketId: params.ticketId,
          userMessage: params.newUserMessage,
          aiResponse: textContent,
          tokensInput: totalInputTokens,
          tokensOutput: totalOutputTokens,
          latencyMs: Date.now() - startTime,
          escalated: false,
        })

        // Persist assistant message
        await this.persistMessage(params.ticketId, 'assistant', textContent)

        return { message: textContent, escalated: false }
      }

      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        )
        const toolResults: Anthropic.ToolResultBlockParam[] = []

        for (const toolUse of toolUseBlocks) {
          const result = await this.executeTool(
            toolUse.name,
            toolUse.input as Record<string, unknown>,
            params.userId,
            params.ticketId
          )

          // Handle escalation
          if (toolUse.name === 'escalate_to_human') {
            const escalationResult = result as { escalated: boolean; customerMessage: string }

            await this.logInteraction({
              ticketId: params.ticketId,
              userMessage: params.newUserMessage,
              aiResponse: escalationResult.customerMessage,
              tokensInput: totalInputTokens,
              tokensOutput: totalOutputTokens,
              latencyMs: Date.now() - startTime,
              escalated: true,
              escalationReason: (toolUse.input as any).reason,
            })

            return {
              message: escalationResult.customerMessage,
              escalated: true,
              escalationData: result,
            }
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          })
        }

        // Extend conversation with tool results
        currentMessages = [
          ...currentMessages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        ]
        loopCount++
        continue
      }

      break
    }

    // Max loops reached — escalate
    const fallback =
      "I'm sorry, I wasn't able to resolve your request. Let me connect you with a human agent who can help you directly."

    await this.logInteraction({
      ticketId: params.ticketId,
      userMessage: params.newUserMessage,
      aiResponse: fallback,
      tokensInput: totalInputTokens,
      tokensOutput: totalOutputTokens,
      latencyMs: Date.now() - startTime,
      escalated: true,
      escalationReason: 'Max loops reached',
    })

    return { message: fallback, escalated: true }
  }

  private async executeTool(
    name: string,
    input: Record<string, unknown>,
    userId: string | undefined,
    ticketId: string
  ): Promise<object> {
    switch (name) {
      case 'get_booking':
        return getBookingTool(input as any, userId, this.prisma)

      case 'cancel_booking':
        return cancelBookingTool(input as any, userId, this.prisma)

      case 'reschedule_booking':
        return this.rescheduleBooking(input as any, userId)

      case 'get_refund_status':
        return this.getRefundStatus(input as any, userId)

      case 'search_knowledge_base':
        return searchKnowledgeBaseTool(input as any, this.prisma)

      case 'escalate_to_human':
        return escalateToHumanTool(input as any, userId, ticketId, this.prisma)

      case 'create_ticket':
        return createTicketTool(input as any, userId, this.channel, this.prisma)

      default:
        return { error: `Unknown tool: ${name}` }
    }
  }

  private async rescheduleBooking(
    input: { booking_id: string; new_scheduled_at: string },
    userId: string | undefined
  ): Promise<object> {
    const booking = await this.prisma.booking.findUnique({ where: { id: input.booking_id } })
    if (!booking) return { success: false, message: 'Booking not found.' }
    if (userId && booking.customerId !== userId) return { success: false, message: 'Booking not found for this customer.' }

    const newDate = new Date(input.new_scheduled_at)
    const now = new Date()
    const hoursUntilOld = (booking.scheduledAt.getTime() - now.getTime()) / 3600000

    if (hoursUntilOld < 24) {
      return { success: false, message: 'Bookings can only be rescheduled more than 24 hours before the scheduled time.' }
    }

    const duration = booking.scheduledEndAt.getTime() - booking.scheduledAt.getTime()
    const newEndAt = new Date(newDate.getTime() + duration)

    await this.prisma.booking.update({
      where: { id: input.booking_id },
      data: { scheduledAt: newDate, scheduledEndAt: newEndAt },
    })

    await this.prisma.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        status: booking.status,
        note: `Rescheduled via AI agent to ${newDate.toISOString()}`,
        changedById: userId,
      },
    })

    return {
      success: true,
      new_scheduled_at: newDate.toISOString(),
      message: `Booking rescheduled to ${newDate.toLocaleString()}. Your provider has been notified.`,
    }
  }

  private async getRefundStatus(
    input: { booking_id: string },
    userId: string | undefined
  ): Promise<object> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: input.booking_id },
      include: { payment: true },
    })

    if (!booking) return { found: false, message: 'Booking not found.' }
    if (userId && booking.customerId !== userId) return { found: false, message: 'Booking not found.' }

    if (booking.paymentStatus === 'REFUNDED') {
      return {
        found: true,
        refund_status: 'processed',
        refunded_amount: booking.payment?.refundedAmount,
        currency: booking.currency,
        message: 'Your refund has been processed and should appear in your account within 5-10 business days.',
      }
    }

    if (['CANCELLED_CUSTOMER', 'CANCELLED_PROVIDER', 'CANCELLED_ADMIN'].includes(booking.status)) {
      return {
        found: true,
        refund_status: 'pending',
        message: 'Your cancellation is confirmed. Refund will be processed within 5-10 business days.',
      }
    }

    return {
      found: true,
      refund_status: 'not_applicable',
      booking_status: booking.status,
      message: 'This booking has not been cancelled, so no refund applies.',
    }
  }

  private async persistMessage(ticketId: string, role: 'user' | 'assistant', content: string) {
    await this.prisma.ticketMessage.create({
      data: { ticketId, role, content },
    })
  }

  private async logInteraction(data: {
    ticketId: string
    userMessage: string
    aiResponse: string
    tokensInput: number
    tokensOutput: number
    latencyMs: number
    escalated: boolean
    escalationReason?: string
  }) {
    await this.prisma.aIInteraction.create({
      data: {
        ticketId: data.ticketId,
        userMessage: data.userMessage,
        aiResponse: data.aiResponse,
        tokensInput: data.tokensInput,
        tokensOutput: data.tokensOutput,
        model: MODEL,
        latencyMs: data.latencyMs,
        escalated: data.escalated,
        escalationReason: data.escalationReason,
      },
    })
  }
}
