import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const kycReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().optional(),
})

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticateAdmin)

  // GET /admin/providers — KYC queue
  fastify.get('/providers', async (request, reply) => {
    const status = (request.query as any).status ?? 'PENDING'

    const providers = await fastify.prisma.provider.findMany({
      where: { kycStatus: status as any },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, createdAt: true } },
        documents: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return reply.send({ success: true, data: providers })
  })

  // PUT /admin/providers/:id/kyc
  fastify.put<{ Params: { id: string } }>('/providers/:id/kyc', async (request, reply) => {
    const body = kycReviewSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ success: false, error: 'Validation error' })
    }

    const provider = await fastify.prisma.provider.update({
      where: { id: request.params.id },
      data: {
        kycStatus: body.data.status,
        kycReviewNote: body.data.note,
        kycReviewedAt: new Date(),
        kycReviewedById: request.user.sub,
      },
    })

    return reply.send({ success: true, data: provider })
  })

  // GET /admin/bookings
  fastify.get('/bookings', async (request, reply) => {
    const q = request.query as any
    const page = parseInt(q.page ?? '1', 10)
    const pageSize = parseInt(q.pageSize ?? '20', 10)

    const where: any = {}
    if (q.status) where.status = q.status
    if (q.dateFrom) where.scheduledAt = { gte: new Date(q.dateFrom) }
    if (q.dateTo) where.scheduledAt = { ...where.scheduledAt, lte: new Date(q.dateTo) }

    const [bookings, total] = await Promise.all([
      fastify.prisma.booking.findMany({
        where,
        include: {
          customer: { select: { firstName: true, lastName: true, email: true } },
          service: { include: { translations: { where: { locale: 'en' } } } },
          provider: { include: { user: { select: { firstName: true, lastName: true } } } },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      fastify.prisma.booking.count({ where }),
    ])

    return reply.send({ success: true, data: bookings, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  })

  // GET /admin/stats
  fastify.get('/stats', async (request, reply) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [bookingsToday, totalRevenue, activeProviders, openTickets] = await Promise.all([
      fastify.prisma.booking.count({ where: { createdAt: { gte: today } } }),
      fastify.prisma.payment.aggregate({ _sum: { amount: true } }),
      fastify.prisma.provider.count({ where: { kycStatus: 'APPROVED' } }),
      fastify.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } } }),
    ])

    return reply.send({
      success: true,
      data: {
        bookingsToday,
        totalRevenue: totalRevenue._sum.amount ?? 0,
        activeProviders,
        openTickets,
      },
    })
  })

  // GET /admin/tickets
  fastify.get('/tickets', async (request, reply) => {
    const q = request.query as any
    const page = parseInt(q.page ?? '1', 10)
    const pageSize = parseInt(q.pageSize ?? '20', 10)

    const where: any = {}
    if (q.status) where.status = q.status
    if (q.escalatedOnly === 'true') where.escalatedToHuman = true

    const [tickets, total] = await Promise.all([
      fastify.prisma.supportTicket.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          messages: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      fastify.prisma.supportTicket.count({ where }),
    ])

    return reply.send({ success: true, data: tickets, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  })

  // PUT /admin/tickets/:id — assign / update ticket
  fastify.put<{ Params: { id: string } }>('/tickets/:id', async (request, reply) => {
    const body = z.object({
      status: z.string().optional(),
      assignedAgentId: z.string().optional(),
      priority: z.string().optional(),
    }).safeParse(request.body)

    if (!body.success) return reply.status(400).send({ success: false, error: 'Validation error' })

    const ticket = await fastify.prisma.supportTicket.update({
      where: { id: request.params.id },
      data: body.data as any,
    })

    return reply.send({ success: true, data: ticket })
  })

  // GET /admin/users
  fastify.get('/users', async (request, reply) => {
    const q = request.query as any
    const page = parseInt(q.page ?? '1', 10)
    const pageSize = parseInt(q.pageSize ?? '20', 10)

    const where: any = { deletedAt: null }
    if (q.search) {
      where.OR = [
        { email: { contains: q.search, mode: 'insensitive' } },
        { firstName: { contains: q.search, mode: 'insensitive' } },
        { lastName: { contains: q.search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      fastify.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          countryCode: true,
          createdAt: true,
          _count: { select: { bookings: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      fastify.prisma.user.count({ where }),
    ])

    return reply.send({ success: true, data: users, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  })

  // PUT /admin/users/:id/suspend
  fastify.put<{ Params: { id: string } }>('/users/:id/suspend', async (request, reply) => {
    const user = await fastify.prisma.user.update({
      where: { id: request.params.id },
      data: { status: 'SUSPENDED' },
    })
    return reply.send({ success: true, data: user })
  })
}
