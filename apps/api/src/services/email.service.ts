import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

function createTransport() {
  if (process.env.NODE_ENV === 'production') {
    // SendGrid SMTP in production
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    })
  }
  // MailHog in dev
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
    secure: false,
  })
}

const transporter = createTransport()

const FROM = process.env.SENDGRID_FROM_EMAIL ?? 'noreply@servifyeu.com'
const FROM_NAME = process.env.SENDGRID_FROM_NAME ?? 'ServifyEU'

export class EmailService {
  async send(options: EmailOptions): Promise<void> {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text ?? options.html.replace(/<[^>]+>/g, ''),
    })
  }

  async sendVerificationEmail(email: string, token: string, locale = 'en'): Promise<void> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
    const verifyUrl = `${baseUrl}/${locale}/auth/verify-email?token=${token}`

    const subjects: Record<string, string> = {
      en: 'Verify your ServifyEU email address',
      de: 'Verifizieren Sie Ihre ServifyEU-E-Mail-Adresse',
      fr: 'Vérifiez votre adresse e-mail ServifyEU',
      nl: 'Verifieer uw ServifyEU-e-mailadres',
      es: 'Verifica tu dirección de correo electrónico de ServifyEU',
    }

    await this.send({
      to: email,
      subject: subjects[locale] ?? subjects['en'],
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2563EB; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0;">ServifyEU</h1>
          </div>
          <div style="padding: 32px; background: #fff;">
            <h2>Welcome to ServifyEU!</h2>
            <p>Please verify your email address to activate your account.</p>
            <a href="${verifyUrl}" style="
              display: inline-block;
              background: #2563EB;
              color: white;
              padding: 12px 24px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 600;
              margin: 16px 0;
            ">Verify Email Address</a>
            <p style="color: #6B7280; font-size: 14px;">
              This link expires in 24 hours. If you didn't create an account, please ignore this email.
            </p>
          </div>
          <div style="padding: 16px; text-align: center; color: #9CA3AF; font-size: 12px;">
            ServifyEU Ltd · EU Home Services Marketplace
          </div>
        </div>
      `,
    })
  }

  async sendPasswordResetEmail(email: string, token: string, locale = 'en'): Promise<void> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
    const resetUrl = `${baseUrl}/${locale}/auth/reset-password?token=${token}`

    await this.send({
      to: email,
      subject: 'Reset your ServifyEU password',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2563EB; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0;">ServifyEU</h1>
          </div>
          <div style="padding: 32px; background: #fff;">
            <h2>Reset your password</h2>
            <p>We received a request to reset your password. Click the button below to create a new password.</p>
            <a href="${resetUrl}" style="
              display: inline-block;
              background: #2563EB;
              color: white;
              padding: 12px 24px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 600;
              margin: 16px 0;
            ">Reset Password</a>
            <p style="color: #6B7280; font-size: 14px;">
              This link expires in 2 hours. If you didn't request a password reset, please ignore this email.
            </p>
          </div>
        </div>
      `,
    })
  }

  async sendBookingConfirmation(data: {
    to: string
    customerName: string
    bookingNumber: string
    serviceName: string
    scheduledAt: string
    providerName: string
    address: string
    totalAmount: string
    currency: string
  }): Promise<void> {
    await this.send({
      to: data.to,
      subject: `Booking confirmed — ${data.bookingNumber}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2563EB; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0;">ServifyEU</h1>
          </div>
          <div style="padding: 32px; background: #fff;">
            <h2 style="color: #059669;">Booking Confirmed!</h2>
            <p>Hi ${data.customerName}, your booking is confirmed.</p>
            <div style="background: #F9FAFB; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="color: #6B7280; padding: 4px 0;">Booking #</td><td style="font-weight: 600;">${data.bookingNumber}</td></tr>
                <tr><td style="color: #6B7280; padding: 4px 0;">Service</td><td style="font-weight: 600;">${data.serviceName}</td></tr>
                <tr><td style="color: #6B7280; padding: 4px 0;">Provider</td><td style="font-weight: 600;">${data.providerName}</td></tr>
                <tr><td style="color: #6B7280; padding: 4px 0;">Date & Time</td><td style="font-weight: 600;">${data.scheduledAt}</td></tr>
                <tr><td style="color: #6B7280; padding: 4px 0;">Address</td><td style="font-weight: 600;">${data.address}</td></tr>
                <tr><td style="color: #6B7280; padding: 4px 0;">Total</td><td style="font-weight: 600;">${data.totalAmount} ${data.currency}</td></tr>
              </table>
            </div>
            <p style="color: #6B7280; font-size: 14px;">
              You'll receive a reminder 24 hours before your appointment.
            </p>
          </div>
        </div>
      `,
    })
  }
}
