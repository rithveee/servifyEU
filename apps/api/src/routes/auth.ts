import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AuthService } from '../services/auth.service'
import { EmailService } from '../services/email.service'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  countryCode: z.enum(['GB', 'DE', 'FR', 'NL', 'ES']),
  locale: z.enum(['en', 'de', 'fr', 'nl', 'es']),
  gdprConsent: z.boolean(),
  marketingOptIn: z.boolean().default(false),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const refreshSchema = z.object({
  refreshToken: z.string(),
})

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(128),
})

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify.prisma, fastify.redis)
  const emailService = new EmailService()

  // POST /auth/register
  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ success: false, error: 'Validation error', details: body.error.flatten() })
    }

    try {
      const { user, verificationToken } = await authService.register(body.data)

      // Send verification email (non-blocking)
      emailService
        .sendVerificationEmail(user.email, verificationToken, body.data.locale)
        .catch((err) => fastify.log.error('Failed to send verification email:', err))

      return reply.status(201).send({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: { userId: user.id },
      })
    } catch (err: any) {
      if (err.message === 'Email already registered') {
        return reply.status(409).send({ success: false, error: err.message })
      }
      if (err.message === 'GDPR consent is required to register') {
        return reply.status(400).send({ success: false, error: err.message })
      }
      throw err
    }
  })

  // POST /auth/login
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ success: false, error: 'Validation error', details: body.error.flatten() })
    }

    try {
      const tokens = await authService.login(body.data.email, body.data.password)
      return reply.send({ success: true, data: tokens })
    } catch (err: any) {
      const clientErrors = ['Invalid credentials', 'Account suspended. Please contact support.', 'Account not found']
      if (clientErrors.includes(err.message)) {
        return reply.status(401).send({ success: false, error: err.message })
      }
      throw err
    }
  })

  // POST /auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    const body = refreshSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ success: false, error: 'Missing refresh token' })
    }

    try {
      const tokens = await authService.refreshTokens(body.data.refreshToken)
      return reply.send({ success: true, data: tokens })
    } catch {
      return reply.status(401).send({ success: false, error: 'Invalid or expired refresh token' })
    }
  })

  // POST /auth/logout
  fastify.post('/logout', async (request, reply) => {
    const body = refreshSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ success: false, error: 'Missing refresh token' })
    }

    await authService.logout(body.data.refreshToken)
    return reply.send({ success: true, message: 'Logged out successfully' })
  })

  // POST /auth/forgot-password
  fastify.post('/forgot-password', async (request, reply) => {
    const body = forgotPasswordSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ success: false, error: 'Valid email required' })
    }

    const token = await authService.requestPasswordReset(body.data.email)

    if (token) {
      emailService
        .sendPasswordResetEmail(body.data.email, token)
        .catch((err) => fastify.log.error('Failed to send reset email:', err))
    }

    // Always return success to avoid email enumeration
    return reply.send({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.',
    })
  })

  // POST /auth/reset-password
  fastify.post('/reset-password', async (request, reply) => {
    const body = resetPasswordSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ success: false, error: 'Validation error', details: body.error.flatten() })
    }

    try {
      await authService.resetPassword(body.data.token, body.data.password)
      return reply.send({ success: true, message: 'Password reset successfully. Please log in.' })
    } catch (err: any) {
      const clientErrors = ['Invalid reset token', 'Token already used', 'Token expired']
      if (clientErrors.includes(err.message)) {
        return reply.status(400).send({ success: false, error: err.message })
      }
      throw err
    }
  })

  // GET /auth/verify-email/:token
  fastify.get<{ Params: { token: string } }>('/verify-email/:token', async (request, reply) => {
    const { token } = request.params

    try {
      await authService.verifyEmail(token)
      return reply.send({ success: true, message: 'Email verified successfully. You can now log in.' })
    } catch (err: any) {
      const clientErrors = ['Invalid verification token', 'Token already used', 'Token expired']
      if (clientErrors.includes(err.message)) {
        return reply.status(400).send({ success: false, error: err.message })
      }
      throw err
    }
  })

  // GET /auth/me — get current user from access token
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        locale: true,
        currency: true,
        countryCode: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        gdprConsentAt: true,
        createdAt: true,
      },
    })

    if (!user) {
      return reply.status(404).send({ success: false, error: 'User not found' })
    }

    return reply.send({ success: true, data: user })
  })
}
