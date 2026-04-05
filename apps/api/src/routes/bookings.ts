import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import Stripe from 'stripe'
import { calculateVat, calculatePlatformFee, getCancellationRefundPercent } from '@servify/shared-utils'
import { CountryCode } from '@servify/shared-types'

const createBookingSchema = z.object({
  serviceId: z.string(),
  addressId: z.string(),
  providerId: z.string().optional(),
  scheduledAt: z.string().datetime(),
  notes: z.string().max(500).optional(),
  addonIds: z.array(z.string()).default([]),
  promoCode: z.string().optional(),
})

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
    apiVersion: '2024-04-10',
  })
}

export const bookingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // POST /bookings
  fastify.post('/', async (request, reply) => {
    const body = createBookingSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ success: false, error: 'Validation error', details: body.error.flatten() })
    }

    const customerId = request.user.sub
    const { serviceId, addressId, providerId, scheduledAt, notes, addonIds } = body.data

    // Validate service
    const service = await fastify.prisma.service.findUnique({ where: { id: serviceId, isActive: true } })
    if (!service) return reply.status(404).send({ success: false, error: 'Service not found' })

    // Validate address belongs to user
    const address = await fastify.prisma.address.findFirst({ where: { id: addressId, userId: customerId } })
    if (!address) return reply.status(404).send({ success: false, error: 'Address not found' })

    // Get user for VAT calculation
    const user = await fastify.prisma.user.findUnique({ where: { id: customerId } })
    if (!user) return reply.status(404).send({ success: false, error: 'User not found' })

    const scheduledDate = new Date(scheduledAt)
    const scheduledEndAt = new Date(scheduledDate.getTime() + service.durationMinutes * 60000)

    // Calculate pricing
    let baseAmount = Number(service.basePrice)

    // Add addons
    const addons = addonIds.length
      ? await fastify.prisma.serviceAddon.findMany({ where: { id: { in: addonIds }, serviceId } })
      : []
    const addonTotal = addons.reduce((sum, a) => sum + Number(a.price), 0)
    baseAmount += addonTotal

    const vatAmount = calculateVat(baseAmount, user.countryCode as CountryCode)
    const totalAmount = baseAmount + vatAmount
    const platformFee = calculatePlatformFee(baseAmount)
    const providerPayout = baseAmount - platformFee

    // Idempotency key to prevent double-charging
    const idempotencyKey = `booking-${customerId}-${serviceId}-${scheduledAt}`

    // Check if already exists (idempotency)
    const existing = await fastify.prisma.booking.findUnique({ where: { stripeIdempotencyKey: idempotencyKey } })
    if (existing) {
      return reply.status(409).send({ success: false, error: 'Booking already exists', data: { bookingId: existing.id } })
    }

    const stripe = getStripe()

    // Create Stripe PaymentIntent (authorise, don't capture yet)
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(totalAmount * 100), // in cents
        currency: user.currency.toLowerCase(),
        capture_method: 'manual', // capture on job completion
        metadata: {
          customerId,
          serviceId,
          addressId,
        },
        description: `ServifyEU booking — ${service.slug}`,
      },
      { idempotencyKey }
    )

    // Build booking number
    const bookingNumber = `SRV-${Date.now().toString(36).toUpperCase()}`

    // Create booking
    const booking = await fastify.prisma.booking.create({
      data: {
        bookingNumber,
        customerId,
        providerId: providerId ?? null,
        serviceId,
        addressId,
        scheduledAt: scheduledDate,
        scheduledEndAt,
        baseAmount,
        discountAmount: 0,
        vatAmount,
        totalAmount,
        currency: user.currency,
        stripePaymentIntentId: paymentIntent.id,
        stripeIdempotencyKey: idempotencyKey,
        notes,
        status: providerId ? 'CONFIRMED' : 'PENDING',
        paymentStatus: 'AUTHORISED',
        addons: addonIds.length
          ? { create: addons.map((a) => ({ addonId: a.id, price: a.price })) }
          : undefined,
        statusHistory: {
          create: {
            status: providerId ? 'CONFIRMED' : 'PENDING',
            changedById: customerId,
          },
        },
      },
      include: {
        service: { include: { translations: { where: { locale: user.locale } } } },
        address: true,
      },
    })

    return reply.status(201).send({
      success: true,
      data: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        stripeClientSecret: paymentIntent.client_secret,
        totalAmount,
        currency: user.currency,
      },
    })
  })

  // GET /bookings
  fastify.get('/', async (request, reply) => {
    const userId = request.user.sub
    const user = await fastify.prisma.user.findUnique({ where: { id: userId } })

    let bookings
    if (user?.role === 'PROVIDER') {
      const provider = await fastify.prisma.provider.findUnique({ where: { userId } })
      bookings = await fastify.prisma.booking.findMany({
        where: { providerId: provider?.id },
        include: {
          service: { include: { translations: { where: { locale: 'en' } } } },
          customer: { select: { firstName: true, lastName: true, avatarUrl: true } },
          address: true,
        },
        orderBy: { scheduledAt: 'desc' },
      })
    } else {
      bookings = await fastify.prisma.booking.findMany({
        where: { customerId: userId },
        include: {
          service: { include: { translations: { where: { locale: user?.locale ?? 'en' } } } },
          provider: {
            include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
          },
          address: true,
          review: true,
        },
        orderBy: { scheduledAt: 'desc' },
      })
    }

    return reply.send({ success: true, data: bookings })
  })

  // GET /bookings/:id
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const booking = await fastify.prisma.booking.findUnique({
      where: { id: request.params.id },
      include: {
        service: { include: { translations: true } },
        provider: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true, phone: true } } } },
        customer: { select: { firstName: true, lastName: true, email: true } },
        address: true,
        addons: { include: { addon: { include: { translations: true } } } },
        review: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payment: true,
      },
    })

    if (!booking) return reply.status(404).send({ success: false, error: 'Booking not found' })

    // Auth check: customer or assigned provider
    const userId = request.user.sub
    const user = await fastify.prisma.user.findUnique({ where: { id: userId } })
    const provider = user?.role === 'PROVIDER'
      ? await fastify.prisma.provider.findUnique({ where: { userId } })
      : null

    const isCustomer = booking.customerId === userId
    const isProvider = provider && booking.providerId === provider.id
    const isAdmin = ['ADMIN', 'SUPERADMIN', 'SUPPORT_AGENT'].includes(user?.role ?? '')

    if (!isCustomer && !isProvider && !isAdmin) {
      return reply.status(403).send({ success: false, error: 'Forbidden' })
    }

    return reply.send({ success: true, data: booking })
  })

  // PUT /bookings/:id/cancel
  fastify.put<{ Params: { id: string } }>('/:id/cancel', async (request, reply) => {
    const body = z.object({ reason: z.string().optional() }).safeParse(request.body)
    const userId = request.user.sub

    const booking = await fastify.prisma.booking.findUnique({
      where: { id: request.params.id },
      include: { payment: true },
    })

    if (!booking) return reply.status(404).send({ success: false, error: 'Booking not found' })
    if (booking.customerId !== userId) return reply.status(403).send({ success: false, error: 'Forbidden' })
    if (['COMPLETED', 'CANCELLED_CUSTOMER', 'CANCELLED_PROVIDER', 'CANCELLED_ADMIN'].includes(booking.status)) {
      return reply.status(400).send({ success: false, error: 'Booking cannot be cancelled' })
    }

    const refundPercent = getCancellationRefundPercent(booking.scheduledAt)
    const refundAmount = (Number(booking.totalAmount) * refundPercent) / 100

    const stripe = getStripe()

    // Cancel or refund Stripe payment
    if (booking.stripePaymentIntentId) {
      if (booking.paymentStatus === 'CAPTURED') {
        await stripe.refunds.create({
          payment_intent: booking.stripePaymentIntentId,
          amount: Math.round(refundAmount * 100),
        })
      } else if (booking.paymentStatus === 'AUTHORISED') {
        await stripe.paymentIntents.cancel(booking.stripePaymentIntentId)
      }
    }

    await fastify.prisma.$transaction([
      fastify.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED_CUSTOMER',
          cancellationReason: body.data?.reason,
          paymentStatus: refundPercent > 0 ? 'REFUNDED' : booking.paymentStatus,
        },
      }),
      fastify.prisma.bookingStatusHistory.create({
        data: { bookingId: booking.id, status: 'CANCELLED_CUSTOMER', changedById: userId },
      }),
    ])

    return reply.send({
      success: true,
      message: 'Booking cancelled',
      data: { refundPercent, refundAmount, currency: booking.currency },
    })
  })

  // PUT /bookings/:id/complete (provider)
  fastify.put<{ Params: { id: string } }>('/:id/complete', async (request, reply) => {
    const userId = request.user.sub
    const provider = await fastify.prisma.provider.findUnique({ where: { userId } })
    if (!provider) return reply.status(403).send({ success: false, error: 'Provider account required' })

    const booking = await fastify.prisma.booking.findUnique({ where: { id: request.params.id } })
    if (!booking) return reply.status(404).send({ success: false, error: 'Booking not found' })
    if (booking.providerId !== provider.id) return reply.status(403).send({ success: false, error: 'Forbidden' })
    if (booking.status !== 'IN_PROGRESS') return reply.status(400).send({ success: false, error: 'Booking is not in progress' })

    // Capture Stripe payment
    if (booking.stripePaymentIntentId) {
      const stripe = getStripe()
      await stripe.paymentIntents.capture(booking.stripePaymentIntentId)
    }

    await fastify.prisma.$transaction([
      fastify.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'COMPLETED',
          actualEndAt: new Date(),
          paymentStatus: 'CAPTURED',
        },
      }),
      fastify.prisma.bookingStatusHistory.create({
        data: { bookingId: booking.id, status: 'COMPLETED', changedById: userId },
      }),
      fastify.prisma.provider.update({
        where: { id: provider.id },
        data: { completedJobs: { increment: 1 } },
      }),
    ])

    return reply.send({ success: true, message: 'Booking marked as completed' })
  })

  // POST /bookings/:id/review
  fastify.post<{ Params: { id: string } }>('/:id/review', async (request, reply) => {
    const body = reviewSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ success: false, error: 'Validation error', details: body.error.flatten() })
    }

    const userId = request.user.sub
    const booking = await fastify.prisma.booking.findUnique({ where: { id: request.params.id } })
    if (!booking) return reply.status(404).send({ success: false, error: 'Booking not found' })
    if (booking.customerId !== userId) return reply.status(403).send({ success: false, error: 'Forbidden' })
    if (booking.status !== 'COMPLETED') return reply.status(400).send({ success: false, error: 'Can only review completed bookings' })
    if (!booking.providerId) return reply.status(400).send({ success: false, error: 'No provider assigned' })

    const existingReview = await fastify.prisma.review.findUnique({ where: { bookingId: booking.id } })
    if (existingReview) return reply.status(409).send({ success: false, error: 'Review already submitted' })

    const review = await fastify.prisma.review.create({
      data: {
        bookingId: booking.id,
        customerId: userId,
        providerId: booking.providerId,
        rating: body.data.rating,
        comment: body.data.comment,
      },
    })

    // Update provider aggregate rating
    const { _avg, _count } = await fastify.prisma.review.aggregate({
      where: { providerId: booking.providerId },
      _avg: { rating: true },
      _count: { rating: true },
    })

    await fastify.prisma.provider.update({
      where: { id: booking.providerId },
      data: {
        rating: _avg.rating ?? 0,
        reviewCount: _count.rating,
      },
    })

    return reply.status(201).send({ success: true, data: review })
  })
}
