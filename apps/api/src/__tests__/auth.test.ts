import { buildApp } from '../app'
import { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeAll(async () => {
  // Use test env vars
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? ''
  process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? process.env.REDIS_URL ?? 'redis://localhost:6379'
  process.env.JWT_SECRET = 'test-secret-key-for-testing-only'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key'
  process.env.NODE_ENV = 'test'

  app = await buildApp()
})

afterAll(async () => {
  await app.close()
})

describe('Health Check', () => {
  it('GET /health returns 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.status).toBe('ok')
  })
})

describe('Auth — Registration', () => {
  const testEmail = `test-${Date.now()}@servifyeu-test.com`

  it('POST /auth/register — requires GDPR consent', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: testEmail,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        countryCode: 'DE',
        locale: 'en',
        gdprConsent: false,
        marketingOptIn: false,
      },
    })
    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.body)
    expect(body.success).toBe(false)
  })

  it('POST /auth/register — requires valid email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'not-an-email',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        countryCode: 'DE',
        locale: 'en',
        gdprConsent: true,
      },
    })
    expect(response.statusCode).toBe(400)
  })

  it('POST /auth/register — success with valid data', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: testEmail,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        countryCode: 'DE',
        locale: 'en',
        gdprConsent: true,
        marketingOptIn: false,
      },
    })
    expect(response.statusCode).toBe(201)
    const body = JSON.parse(response.body)
    expect(body.success).toBe(true)
    expect(body.data.userId).toBeDefined()
  })

  it('POST /auth/register — rejects duplicate email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: testEmail,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        countryCode: 'DE',
        locale: 'en',
        gdprConsent: true,
      },
    })
    expect(response.statusCode).toBe(409)
  })
})

describe('Auth — Login', () => {
  it('POST /auth/login — rejects invalid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'nobody@example.com',
        password: 'wrongpassword',
      },
    })
    expect(response.statusCode).toBe(401)
    const body = JSON.parse(response.body)
    expect(body.success).toBe(false)
  })

  it('POST /auth/login — validates email format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'not-valid',
        password: 'password',
      },
    })
    expect(response.statusCode).toBe(400)
  })
})

describe('Auth — Password Reset', () => {
  it('POST /auth/forgot-password — always returns success (email enumeration prevention)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/forgot-password',
      payload: { email: 'nonexistent@example.com' },
    })
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.success).toBe(true)
  })

  it('POST /auth/reset-password — rejects invalid token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: {
        token: 'invalid-token-that-does-not-exist',
        password: 'NewPassword123!',
      },
    })
    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.body)
    expect(body.success).toBe(false)
  })
})

describe('Auth — Email Verification', () => {
  it('GET /auth/verify-email/:token — rejects invalid token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/verify-email/invalid-token-xyz',
    })
    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.body)
    expect(body.success).toBe(false)
  })
})

describe('Auth — Protected Routes', () => {
  it('GET /auth/me — returns 401 without token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
    })
    expect(response.statusCode).toBe(401)
  })

  it('POST /auth/refresh — rejects invalid refresh token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: 'invalid-refresh-token' },
    })
    expect(response.statusCode).toBe(401)
  })
})
