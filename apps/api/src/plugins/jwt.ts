import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fastifyJwt from '@fastify/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      email: string
      role: string
    }
  }
}

const jwtPlugin: FastifyPluginAsync = fp(async (fastify) => {
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    sign: {
      expiresIn: '15m',
    },
  })

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch {
      reply.status(401).send({ success: false, error: 'Unauthorized' })
    }
  })

  fastify.decorate('authenticateAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
      const adminRoles = ['ADMIN', 'SUPERADMIN', 'SUPPORT_AGENT', 'FINANCE']
      if (!adminRoles.includes(request.user.role)) {
        reply.status(403).send({ success: false, error: 'Forbidden' })
      }
    } catch {
      reply.status(401).send({ success: false, error: 'Unauthorized' })
    }
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    authenticateAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export { jwtPlugin }
