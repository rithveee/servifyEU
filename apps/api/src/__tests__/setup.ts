// Test environment setup
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-chars'
process.env.SMTP_HOST = 'localhost'
process.env.SMTP_PORT = '1025'
