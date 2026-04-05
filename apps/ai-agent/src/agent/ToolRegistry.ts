import Anthropic from '@anthropic-ai/sdk'

export const agentTools: Anthropic.Tool[] = [
  {
    name: 'get_booking',
    description:
      'Retrieve booking details by booking number or by looking up the customer\'s most recent booking. Use when customer asks about their booking status, provider, or scheduled time.',
    input_schema: {
      type: 'object',
      properties: {
        booking_number: {
          type: 'string',
          description: 'The booking reference number (e.g. "SRV-123456")',
        },
        use_most_recent: {
          type: 'boolean',
          description: "Set true to fetch customer's most recent booking if no booking number provided",
        },
      },
    },
  },
  {
    name: 'cancel_booking',
    description:
      'Cancel a booking and process refund according to cancellation policy. ALWAYS confirm with the customer before executing. Explain refund amount first.',
    input_schema: {
      type: 'object',
      required: ['booking_id', 'reason', 'customer_confirmed'],
      properties: {
        booking_id: { type: 'string' },
        reason: {
          type: 'string',
          enum: ['customer_request', 'scheduling_conflict', 'provider_issue', 'other'],
        },
        reason_detail: { type: 'string' },
        customer_confirmed: {
          type: 'boolean',
          description: 'Must be true — never cancel without explicit confirmation',
        },
      },
    },
  },
  {
    name: 'reschedule_booking',
    description:
      'Reschedule a booking to a new date/time. Check availability first, then present options to customer.',
    input_schema: {
      type: 'object',
      required: ['booking_id', 'new_scheduled_at'],
      properties: {
        booking_id: { type: 'string' },
        new_scheduled_at: {
          type: 'string',
          description: 'ISO 8601 datetime',
        },
      },
    },
  },
  {
    name: 'get_refund_status',
    description: 'Check the status and timeline of a refund for a cancelled booking.',
    input_schema: {
      type: 'object',
      required: ['booking_id'],
      properties: {
        booking_id: { type: 'string' },
      },
    },
  },
  {
    name: 'search_knowledge_base',
    description:
      'Search the ServifyEU knowledge base for policies, FAQs, and service information. Use this for any question about policies, how the service works, or what to expect.',
    input_schema: {
      type: 'object',
      required: ['query', 'locale'],
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query',
        },
        locale: {
          type: 'string',
          enum: ['en', 'de', 'fr', 'nl', 'es'],
        },
      },
    },
  },
  {
    name: 'escalate_to_human',
    description:
      'Escalate the conversation to a human support agent. Use when the issue is complex, the customer is very distressed, there is a safety concern, or after 3 failed resolution attempts.',
    input_schema: {
      type: 'object',
      required: ['reason', 'priority'],
      properties: {
        reason: {
          type: 'string',
          description: 'Why escalation is needed',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
        },
        summary: {
          type: 'string',
          description: 'Brief summary of the issue for the human agent',
        },
      },
    },
  },
  {
    name: 'create_ticket',
    description:
      'Create a support ticket for issues that require follow-up or cannot be resolved immediately.',
    input_schema: {
      type: 'object',
      required: ['subject', 'description', 'priority'],
      properties: {
        subject: { type: 'string' },
        description: { type: 'string' },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
        },
        booking_id: { type: 'string' },
      },
    },
  },
]
