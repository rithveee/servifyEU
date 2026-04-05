import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { anonymisePII } from '@servify/shared-utils'

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  locale: z.enum(['en', 'de', 'fr', 'nl', 'es']).optional(),
  marketingOptIn: z.boolean().optional(),
})

const addAddressSchema = z.object({
  label: z.string().default('Home'),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  postcode: z.string().min(1),
  countryCode: z.enum(['GB', 'DE', 'FR', 'NL', 'ES']),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isDefault: z.boolean().default(false),
})

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  // All user routes require authentication
  fastify.addHook('preHandler', fastify.authenticate)

  // GET /users/me
  fastify.get('/me', async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        locale: true,
        currency: true,
        countryCode: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        gdprConsentAt: true,
        marketingOptIn: true,
        createdAt: true,
        addresses: true,
      },
    })

    if (!user) return reply.status(404).send({ success: false, error: 'User not found' })
    return reply.send({ success: true, data: user })
  })

  // PUT /users/me
  fastify.put('/me', async (request, reply) => {
    const body = updateProfileSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ success: false, error: 'Validation error', details: body.error.flatten() })
    }

    const user = await fastify.prisma.user.update({
      where: { id: request.user.sub },
      data: body.data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        locale: true,
        marketingOptIn: true,
      },
    })

    return reply.send({ success: true, data: user })
  })

  // GET /users/me/data-export — GDPR data portability
  fastify.get('/me/data-export', async (request, reply) => {
    const userId = request.user.sub

    const [user, bookings, reviews, addresses, tickets] = await Promise.all([
      fastify.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          locale: true,
          currency: true,
          countryCode: true,
          gdprConsentAt: true,
          marketingOptIn: true,
          createdAt: true,
        },
      }),
      fastify.prisma.booking.findMany({
        where: { customerId: userId },
        include: { service: { include: { translations: { where: { locale: 'en' } } } } },
      }),
      fastify.prisma.review.findMany({ where: { customerId: userId } }),
      fastify.prisma.address.findMany({ where: { userId } }),
      fastify.prisma.supportTicket.findMany({
        where: { userId },
        include: { messages: true },
      }),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      platform: 'ServifyEU',
      user,
      addresses,
      bookings: bookings.map((b) => ({
        bookingNumber: b.bookingNumber,
        service: b.service.translations[0]?.name,
        status: b.status,
        scheduledAt: b.scheduledAt,
        totalAmount: b.totalAmount,
        currency: b.currency,
        createdAt: b.createdAt,
      })),
      reviews,
      supportTickets: tickets.map((t) => ({
        ticketNumber: t.ticketNumber,
        channel: t.channel,
        status: t.status,
        subject: t.subject,
        createdAt: t.createdAt,
        messages: t.messages.filter((m) => !m.isInternal),
      })),
    }

    reply.header('Content-Disposition', 'attachment; filename="servifyeu-data-export.json"')
    reply.header('Content-Type', 'application/json')
    return reply.send(exportData)
  })

  // DELETE /users/me — GDPR right to erasure
  fastify.delete('/me', async (request, reply) => {
    const userId = request.user.sub

    // Check for active bookings
    const activeBooking = await fastify.prisma.booking.findFirst({
      where: {
        customerId: userId,
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
      },
    })

    if (activeBooking) {
      return reply.status(400).send({
        success: false,
        error: 'Cannot delete account with active bookings. Please cancel or complete them first.',
      })
    }

    // Soft delete: anonymise PII but retain financial records
    const anonymised = anonymisePII({ firstName: 'x', lastName: 'x', email: 'x', phone: 'x' })

    await fastify.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: anonymised.firstName!,
        lastName: anonymised.lastName!,
        email: anonymised.email!,
        phone: null,
        avatarUrl: null,
        passwordHash: null,
        deletedAt: new Date(),
        status: 'DELETED',
      },
    })

    // Invalidate all sessions
    const sessions = await fastify.prisma.session.findMany({ where: { userId } })
    for (const session of sessions) {
      await fastify.redis.del(`refresh:${session.refreshToken}`)
    }
    await fastify.prisma.session.deleteMany({ where: { userId } })

    return reply.send({ success: true, message: 'Account deleted. Your data has been anonymised.' })
  })

  // GET /users/me/addresses
  fastify.get('/me/addresses', async (request, reply) => {
    const addresses = await fastify.prisma.address.findMany({
      where: { userId: request.user.sub },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })
    return reply.send({ success: true, data: addresses })
  })

  // POST /users/me/addresses
  fastify.post('/me/addresses', async (request, reply) => {
    const body = addAddressSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ success: false, error: 'Validation error', details: body.error.flatten() })
    }

    const userId = request.user.sub

    // If new address is default, unset others
    if (body.data.isDefault) {
      await fastify.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      })
    }

    const address = await fastify.prisma.address.create({
      data: { ...body.data, userId },
    })

    return reply.status(201).send({ success: true, data: address })
  })

  // DELETE /users/me/addresses/:id
  fastify.delete<{ Params: { id: string } }>('/me/addresses/:id', async (request, reply) => {
    const address = await fastify.prisma.address.findFirst({
      where: { id: request.params.id, userId: request.user.sub },
    })

    if (!address) return reply.status(404).send({ success: false, error: 'Address not found' })

    await fastify.prisma.address.delete({ where: { id: request.params.id } })
    return reply.send({ success: true, message: 'Address deleted' })
  })
}
