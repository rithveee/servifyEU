import { format, addDays, isAfter, differenceInHours } from 'date-fns'
import { COUNTRY_VAT_RATES, CountryCode } from '@servify/shared-types'

// ─── Date utilities ───────────────────────────────────────────────────────────

export function formatBookingDate(date: Date | string, locale = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'EEEE, MMMM d, yyyy')
}

export function formatBookingTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'HH:mm')
}

export function isReschedulable(scheduledAt: Date | string): boolean {
  const d = typeof scheduledAt === 'string' ? new Date(scheduledAt) : scheduledAt
  return differenceInHours(d, new Date()) >= 24
}

export function getCancellationRefundPercent(scheduledAt: Date | string): number {
  const d = typeof scheduledAt === 'string' ? new Date(scheduledAt) : scheduledAt
  const hoursUntil = differenceInHours(d, new Date())
  if (hoursUntil >= 48) return 100
  if (hoursUntil >= 24) return 50
  return 0
}

// ─── Currency / money utilities ───────────────────────────────────────────────

export function formatCurrency(amount: number, currency: string, locale = 'en'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function calculateVat(baseAmount: number, countryCode: CountryCode): number {
  const rate = COUNTRY_VAT_RATES[countryCode] ?? 0.20
  return Math.round(baseAmount * rate * 100) / 100
}

export function calculatePlatformFee(amount: number, feePercent = 20): number {
  return Math.round(amount * (feePercent / 100) * 100) / 100
}

// ─── String utilities ─────────────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  const masked = user.slice(0, 2) + '***'
  return `${masked}@${domain}`
}

export function generateBookingNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'SRV-'
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// ─── Distance utilities ───────────────────────────────────────────────────────

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

// ─── Validation utilities ─────────────────────────────────────────────────────

export function isValidIBAN(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase()
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleaned)) return false
  if (cleaned.length < 15 || cleaned.length > 34) return false
  return true
}

export function isValidPostcode(postcode: string, countryCode: CountryCode): boolean {
  const patterns: Record<CountryCode, RegExp> = {
    GB: /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i,
    DE: /^[0-9]{5}$/,
    FR: /^[0-9]{5}$/,
    NL: /^[0-9]{4}\s?[A-Z]{2}$/i,
    ES: /^[0-9]{5}$/,
  }
  return patterns[countryCode]?.test(postcode) ?? false
}

// ─── Anonymisation (GDPR) ─────────────────────────────────────────────────────

export function anonymisePII(data: {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}) {
  return {
    firstName: data.firstName ? '[deleted]' : undefined,
    lastName: data.lastName ? '[deleted]' : undefined,
    email: data.email ? `deleted-${Date.now()}@gdpr.servifyeu.com` : undefined,
    phone: data.phone ? null : undefined,
  }
}
