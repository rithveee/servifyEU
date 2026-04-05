import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { haversineDistance } from '@servify/shared-utils'

const applySchema = z.object({
  businessName: z.string().optional(),
  vatNumber: z.string().optional(),
  bio: z.string().max(1000).optional(),
  yearsExperience: z.number().int().min(0).max(50).optional(),
  serviceRadius: z.number().int().min(5).max(100).default(20),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

const availabilitySchema = z.array(
  z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    isActive: z.boolean().default(true),
  })
)

const availableProvidersSchema = z.object({
  serviceId: z.string(),
  addressId: z.string(),
  scheduledAt: z.string().datetime(),
})

export const providerRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /providers/apply
  fastify.post('/apply', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = applySchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ success: false, error: 'Validation error', details: body.error.flatten() })
    }

    const existing = await fastify.prisma.provider.findUnique({
      where: { userId: request.user.sub },
    })
    if (existing) {
      return reply.status(409).send({ success: false, error: 'Provider profile already exists' })
    }

    const provider = await fastify.prisma.provider.create({
      data: { ...body.data, userId: request.user.sub },
    })

    // Update user role
    await fastify.prisma.user.update({
      where: { id: request.user.sub },
      data: { role: 'PROVIDER' },
    })

    return reply.status(201).send({ success: true, data: provider })
  })

  // GET /providers/me
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const provider = await fastify.prisma.provider.findUnique({
      where: { userId: request.user.sub },
      include: {
        services: { include: { service: { include: { translations: { where: { locale: 'en' } } } } } },
        availability: { where: { isActive: true }, orderBy: { dayOfWeek: 'asc' } },
        documents: true,
      },
    })

    if (!provider) return reply.status(404).send({ success: false, error: 'Provider profile not found' })
    return reply.send({ success: true, data: provider })
  })

  // PUT /providers/me
  fastify.put('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = applySchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ success: false, error: 'Validation error', details: body.error.flatten() })
    }

    const provider = await fastify.prisma.provider.update({
      where: { userId: request.user.sub },
      data: body.data,
    })

    return reply.send({ success: true, data: provider })
  })

  // PUT /providers/me/availability
  fastify.put('/me/availability', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = availabilitySchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ success: false, error: 'Validation error', details: body.error.flatten() })
    }

    const provider = await fastify.prisma.provider.findUnique({ where: { userId: request.user.sub } })
    if (!provider) return reply.status(404).send({ success: false, error: 'Provider profile not found' })

    // Replace all availability slots
    await fastify.prisma.availability.deleteMany({ where: { providerId: provider.id } })
    await fastify.prisma.availability.createMany({
      data: body.data.map((slot) => ({ ...slot, providerId: provider.id })),
    })

    return reply.send({ success: true, message: 'Availability updated' })
  })

  // GET /providers/:id/profile — public
  fastify.get<{ Params: { id: string } }>('/:id/profile', async (request, reply) => {
    const provider = await fastify.prisma.provider.findUnique({
      where: { id: request.params.id, kycStatus: 'APPROVED' },
      include: {
        user: {
          select: { firstName: true, lastName: true, avatarUrl: true, createdAt: true },
        },
        services: {
          where: { isActive: true },
          include: {
            service: {
              include: { translations: { where: { locale: 'en' } } },
            },
          },
        },
        availability: { where: { isActive: true }, orderBy: { dayOfWeek: 'asc' } },
      },
    })

    if (!provider) return reply.status(404).send({ success: false, error: 'Provider not found' })

    return reply.send({
      success: true,
      data: {
        id: provider.id,
        firstName: provider.user.firstName,
        lastName: provider.user.lastName,
        avatarUrl: provider.user.avatarUrl,
        businessName: provider.businessName,
        bio: provider.bio,
        yearsExperience: provider.yearsExperience,
        serviceRadius: provider.serviceRadius,
        rating: provider.rating,
        reviewCount: provider.reviewCount,
        completedJobs: provider.completedJobs,
        isBackgroundChecked: provider.isBackgroundChecked,
        isOnline: provider.isOnline,
        memberSince: provider.user.createdAt,
        services: provider.services.map((ps) => ({
          id: ps.service.id,
          slug: ps.service.slug,
          name: ps.service.translations[0]?.name ?? ps.service.slug,
          price: ps.customPrice ?? ps.service.basePrice,
          currency: ps.service.currency,
          durationMinutes: ps.service.durationMinutes,
        })),
        availability: provider.availability,
      },
    })
  })

  // GET /providers/:id/reviews
  fastify.get<{ Params: { id: string }; Querystring: { page?: string; pageSize?: string } }>(
    '/:id/reviews',
    async (request, reply) => {
      const page = parseInt(request.query.page ?? '1', 10)
      const pageSize = parseInt(request.query.pageSize ?? '10', 10)

      const [reviews, total] = await Promise.all([
        fastify.prisma.review.findMany({
          where: { providerId: request.params.id, isPublic: true },
          include: {
            customer: { select: { firstName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: pageSize,
          skip: (page - 1) * pageSize,
        }),
        fastify.prisma.review.count({ where: { providerId: request.params.id, isPublic: true } }),
      ])

      return reply.send({
        success: true,
        data: reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          providerReply: r.providerReply,
          customerName: r.customer.firstName,
          customerAvatar: r.customer.avatarUrl,
          createdAt: r.createdAt,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      })
    }
  )

  // GET /providers/available — find providers for a booking slot
  fastify.get('/available', async (request, reply) => {
    const params = availableProvidersSchema.safeParse(request.query)
    if (!params.success) {
      return reply.status(400).send({ success: false, error: 'Invalid parameters' })
    }

    const { serviceId, addressId, scheduledAt } = params.data
    const scheduledDate = new Date(scheduledAt)
    const dayOfWeek = scheduledDate.getDay()
    const timeStr = `${String(scheduledDate.getHours()).padStart(2, '0')}:${String(scheduledDate.getMinutes()).padStart(2, '0')}`

    const address = await fastify.prisma.address.findUnique({ where: { id: addressId } })
    if (!address) return reply.status(404).send({ success: false, error: 'Address not found' })

    // Find providers offering the service with approved KYC
    const providers = await fastify.prisma.provider.findMany({
      where: {
        kycStatus: 'APPROVED',
        services: { some: { serviceId, isActive: true } },
        availability: {
          some: {
            dayOfWeek,
            startTime: { lte: timeStr },
            endTime: { gte: timeStr },
            isActive: true,
          },
        },
      },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        services: { where: { serviceId }, include: { service: true } },
      },
    })

    // Filter by radius and check no conflicting bookings
    const available = []
    for (const provider of providers) {
      if (provider.latitude && provider.longitude && address.latitude && address.longitude) {
        const distance = haversineDistance(
          provider.latitude,
          provider.longitude,
          address.latitude,
          address.longitude
        )
        if (distance > provider.serviceRadius) continue
      }

      // Check no conflicting bookings
      const service = await fastify.prisma.service.findUnique({ where: { id: serviceId } })
      const endTime = new Date(scheduledDate.getTime() + (service?.durationMinutes ?? 60) * 60000)

      const conflict = await fastify.prisma.booking.findFirst({
        where: {
          providerId: provider.id,
          status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
          OR: [
            { scheduledAt: { lte: scheduledDate }, scheduledEndAt: { gt: scheduledDate } },
            { scheduledAt: { lt: endTime }, scheduledEndAt: { gte: endTime } },
            { scheduledAt: { gte: scheduledDate }, scheduledEndAt: { lte: endTime } },
          ],
        },
      })

      if (!conflict) {
        const ps = provider.services[0]
        available.push({
          id: provider.id,
          firstName: provider.user.firstName,
          lastName: provider.user.lastName,
          avatarUrl: provider.user.avatarUrl,
          rating: provider.rating,
          reviewCount: provider.reviewCount,
          completedJobs: provider.completedJobs,
          price: ps?.customPrice ?? ps?.service.basePrice,
          currency: ps?.service.currency ?? 'EUR',
        })
      }
    }

    // Sort by rating desc
    available.sort((a, b) => b.rating - a.rating)

    return reply.send({ success: true, data: available })
  })
}
