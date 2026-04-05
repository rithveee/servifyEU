import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { setupChatHandler } from './channels/ChatHandler'

const app = express()
app.use(express.json())

const httpServer = createServer(app)
const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')

// Socket.io for live chat
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
  },
})

setupChatHandler(io, prisma, redis)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-agent', timestamp: new Date().toISOString() })
})

// Email inbound webhook (SendGrid Inbound Parse)
app.post('/webhooks/email/inbound', async (req, res) => {
  try {
    const { from, subject, text, html } = req.body

    // Extract sender email
    const senderEmail = (from as string)?.match(/<(.+)>/)?.[1] ?? from

    // Find user
    const user = await prisma.user.findUnique({ where: { email: senderEmail } })

    // Create ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user?.id,
        channel: 'EMAIL',
        status: 'OPEN',
        priority: 'MEDIUM',
        subject: subject ?? 'Email support request',
        aiHandled: true,
      },
    })

    await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, role: 'user', content: text ?? html ?? '' },
    })

    res.json({ success: true, ticketId: ticket.id })
  } catch (err) {
    console.error('Email webhook error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Twilio voice webhook
app.post('/webhooks/voice/inbound', (req, res) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy-Neural">
    Welcome to ServifyEU customer support. Please say your question or press 1 for bookings, 2 for payments, or 3 to speak to an agent.
  </Say>
  <Gather input="speech dtmf" timeout="5" numDigits="1" action="/webhooks/voice/gather">
    <Say>Please speak now or press a key.</Say>
  </Gather>
</Response>`

  res.type('text/xml').send(twiml)
})

app.post('/webhooks/voice/gather', async (req, res) => {
  const speechResult = req.body.SpeechResult ?? ''
  const digits = req.body.Digits

  if (digits === '3') {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy-Neural">Connecting you to a human agent now. Please hold.</Say>
  <Dial>${process.env.SUPPORT_PHONE_NUMBER ?? ''}</Dial>
</Response>`
    res.type('text/xml').send(twiml)
    return
  }

  // AI processes speech
  const responseText = speechResult
    ? `Thank you for your query about: ${speechResult}. Let me look into that for you. Please call back or visit our website at servifyeu.com for immediate assistance.`
    : "I didn't catch that. Please visit servifyeu.com or call back to speak with an agent."

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy-Neural">${responseText}</Say>
  <Hangup/>
</Response>`

  res.type('text/xml').send(twiml)
})

const PORT = parseInt(process.env.AI_AGENT_PORT ?? '3004', 10)

httpServer.listen(PORT, () => {
  console.log(`ServifyEU AI Agent running on port ${PORT}`)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  await redis.quit()
  process.exit(0)
})
