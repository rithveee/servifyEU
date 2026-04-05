import { FastifyPluginAsync } from 'fastify'
import Stripe from 'stripe'

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  // Stripe webhook — must receive raw body
  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    done(null, body)
  })

  fastify.post('/stripe', async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

    if (!sig || !webhookSecret) {
      return reply.status(400).send({ error: 'Missing signature or webhook secret' })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-04-10' })

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(request.body as Buffer, sig, webhookSecret)
    } catch (err: any) {
      fastify.log.warn('Stripe webhook signature verification failed:', err.message)
      return reply.status(400).send({ error: 'Invalid signature' })
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        await fastify.prisma.booking.updateMany({
          where: { stripePaymentIntentId: pi.id },
          data: { paymentStatus: 'CAPTURED' },
        })
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        await fastify.prisma.booking.updateMany({
          where: { stripePaymentIntentId: pi.id },
          data: { paymentStatus: 'FAILED', status: 'CANCELLED_ADMIN' },
        })
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        if (charge.payment_intent) {
          await fastify.prisma.payment.updateMany({
            where: { stripePaymentIntentId: charge.payment_intent as string },
            data: { status: 'REFUNDED', refundedAmount: charge.amount_refunded / 100 },
          })
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        await fastify.prisma.provider.updateMany({
          where: { stripeConnectId: account.id },
          data: { stripeConnectOnboarded: account.charges_enabled },
        })
        break
      }

      default:
        fastify.log.info(`Unhandled Stripe event: ${event.type}`)
    }

    return reply.send({ received: true })
  })
}
