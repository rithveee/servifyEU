import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import Redis from 'ioredis'
import { AuthTokens } from '@servify/shared-types'

const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL = '7d'
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis
  ) {}

  async register(data: {
    email: string
    password: string
    firstName: string
    lastName: string
    countryCode: string
    locale: string
    gdprConsent: boolean
    marketingOptIn: boolean
  }) {
    if (!data.gdprConsent) {
      throw new Error('GDPR consent is required to register')
    }

    const existing = await this.prisma.user.findUnique({ where: { email: data.email } })
    if (existing) {
      throw new Error('Email already registered')
    }

    const passwordHash = await bcrypt.hash(data.password, 12)
    const verificationToken = randomBytes(32).toString('hex')
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    const [user] = await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          countryCode: data.countryCode,
          locale: data.locale,
          currency: data.countryCode === 'GB' ? 'GBP' : 'EUR',
          gdprConsentAt: new Date(),
          marketingOptIn: data.marketingOptIn,
          status: 'PENDING_VERIFICATION',
        },
      }),
      this.prisma.emailVerificationToken.create({
        data: {
          email: data.email,
          token: verificationToken,
          expiresAt: verificationExpiry,
        },
      }),
    ])

    return { user, verificationToken }
  }

  async login(email: string, password: string): Promise<AuthTokens & { userId: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials')
    }
    if (user.status === 'DELETED') {
      throw new Error('Account not found')
    }
    if (user.status === 'SUSPENDED') {
      throw new Error('Account suspended. Please contact support.')
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      throw new Error('Invalid credentials')
    }

    return this.generateTokens(user.id, user.email, user.role)
  }

  async generateTokens(
    userId: string,
    email: string,
    role: string
  ): Promise<AuthTokens & { userId: string }> {
    const accessToken = jwt.sign(
      { sub: userId, email, role },
      process.env.JWT_SECRET ?? 'change-me',
      { expiresIn: ACCESS_TOKEN_TTL }
    )

    const refreshToken = randomBytes(40).toString('hex')

    // Store refresh token in Redis
    await this.redis.setex(
      `refresh:${refreshToken}`,
      REFRESH_TOKEN_TTL_SECONDS,
      JSON.stringify({ userId, email, role })
    )

    // Persist session
    await this.prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
    })

    return { accessToken, refreshToken, expiresIn: 900, userId }
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens & { userId: string }> {
    const data = await this.redis.get(`refresh:${refreshToken}`)
    if (!data) {
      throw new Error('Invalid or expired refresh token')
    }

    const { userId, email, role } = JSON.parse(data)

    // Rotate: invalidate old token
    await this.redis.del(`refresh:${refreshToken}`)
    await this.prisma.session.deleteMany({ where: { refreshToken } })

    return this.generateTokens(userId, email, role)
  }

  async logout(refreshToken: string): Promise<void> {
    await this.redis.del(`refresh:${refreshToken}`)
    await this.prisma.session.deleteMany({ where: { refreshToken } })
  }

  async verifyEmail(token: string): Promise<void> {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    })

    if (!record) throw new Error('Invalid verification token')
    if (record.usedAt) throw new Error('Token already used')
    if (new Date() > record.expiresAt) throw new Error('Token expired')

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { email: record.email },
        data: { emailVerified: true, status: 'ACTIVE' },
      }),
      this.prisma.emailVerificationToken.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
    ])
  }

  async requestPasswordReset(email: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { email } })
    // Don't reveal if email exists — always return success
    if (!user) return ''

    const token = randomBytes(32).toString('hex')
    await this.prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2h
      },
    })

    return token
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { token } })
    if (!record) throw new Error('Invalid reset token')
    if (record.usedAt) throw new Error('Token already used')
    if (new Date() > record.expiresAt) throw new Error('Token expired')

    const passwordHash = await bcrypt.hash(newPassword, 12)

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { email: record.email },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
    ])

    // Invalidate all sessions for this user
    const user = await this.prisma.user.findUnique({ where: { email: record.email } })
    if (user) {
      const sessions = await this.prisma.session.findMany({ where: { userId: user.id } })
      for (const session of sessions) {
        await this.redis.del(`refresh:${session.refreshToken}`)
      }
      await this.prisma.session.deleteMany({ where: { userId: user.id } })
    }
  }
}
