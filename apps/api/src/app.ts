import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import { prismaPlugin } from './plugins/prisma'
import { redisPlugin } from './plugins/redis'
import { jwtPlugin } from './plugins/jwt'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { providerRoutes } from './routes/providers'
import { serviceRoutes } from './routes/services'
import { bookingRoutes } from './routes/bookings'
import { webhookRoutes } from './routes/webhooks'
import { adminRoutes } from './routes/admin'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  })

  // Security
  await app.register(helmet, {
    contentSecurityPolicy: false,
  })

  await app.register(cors, {
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
    credentials: true,
  })

  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      success: false,
      error: 'Too many requests. Please try again later.',
    }),
  })

  // Multipart (file uploads)
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  })

  // Plugins
  await app.register(prismaPlugin)
  await app.register(redisPlugin)
  await app.register(jwtPlugin)

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // Routes
  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(userRoutes, { prefix: '/users' })
  await app.register(providerRoutes, { prefix: '/providers' })
  await app.register(serviceRoutes, { prefix: '/services' })
  await app.register(bookingRoutes, { prefix: '/bookings' })
  await app.register(webhookRoutes, { prefix: '/webhooks' })
  await app.register(adminRoutes, { prefix: '/admin' })

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({ success: false, error: 'Route not found' })
  })

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error)

    if (error.statusCode) {
      reply.status(error.statusCode).send({
        success: false,
        error: error.message,
      })
      return
    }

    reply.status(500).send({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    })
  })

  return app
}
