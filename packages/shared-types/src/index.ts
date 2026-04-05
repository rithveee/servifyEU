// Auth types
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface JWTPayload {
  sub: string
  email: string
  role: UserRole
  iat: number
  exp: number
}

// User types
export type UserRole = 'CUSTOMER' | 'PROVIDER' | 'ADMIN' | 'SUPERADMIN' | 'SUPPORT_AGENT' | 'FINANCE'
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' | 'DELETED'
export type KYCStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED'

export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string
  locale: string
  currency: string
  countryCode: string
  role: UserRole
  status: UserStatus
  emailVerified: boolean
  phoneVerified: boolean
  gdprConsentAt?: string
  createdAt: string
}

// Provider types
export interface ProviderProfile {
  id: string
  userId: string
  businessName?: string
  bio?: string
  yearsExperience?: number
  serviceRadius: number
  latitude?: number
  longitude?: number
  rating: number
  reviewCount: number
  completedJobs: number
  isBackgroundChecked: boolean
  kycStatus: KYCStatus
  isOnline: boolean
}

// Service types
export type PricingType = 'FIXED' | 'HOURLY' | 'CUSTOM_QUOTE'

export interface ServiceCategory {
  id: string
  slug: string
  icon: string
  sortOrder: number
  name: string
  description?: string
}

export interface Service {
  id: string
  slug: string
  categoryId: string
  basePrice: number
  currency: string
  durationMinutes: number
  pricingType: PricingType
  vatRate: number
  name: string
  description: string
  whatToExpect?: string
  includes: string[]
}

// Booking types
export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED_CUSTOMER'
  | 'CANCELLED_PROVIDER'
  | 'CANCELLED_ADMIN'
  | 'NO_SHOW'
  | 'DISPUTED'

export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORISED'
  | 'CAPTURED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'FAILED'

export interface Booking {
  id: string
  bookingNumber: string
  customerId: string
  providerId?: string
  serviceId: string
  addressId: string
  status: BookingStatus
  scheduledAt: string
  scheduledEndAt: string
  baseAmount: number
  discountAmount: number
  vatAmount: number
  totalAmount: number
  currency: string
  paymentStatus: PaymentStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

// Support types
export type SupportChannel = 'CHAT' | 'EMAIL' | 'VOICE' | 'IN_APP'
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING_CUSTOMER' | 'RESOLVED' | 'CLOSED' | 'ESCALATED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface SupportTicket {
  id: string
  ticketNumber: string
  userId?: string
  bookingId?: string
  channel: SupportChannel
  status: TicketStatus
  priority: TicketPriority
  subject: string
  aiHandled: boolean
  escalatedToHuman: boolean
  createdAt: string
}

export interface TicketMessage {
  id: string
  ticketId: string
  role: 'user' | 'assistant' | 'agent'
  content: string
  isInternal: boolean
  createdAt: string
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Locales
export type Locale = 'en' | 'de' | 'fr' | 'nl' | 'es'
export const SUPPORTED_LOCALES: Locale[] = ['en', 'de', 'fr', 'nl', 'es']

// Countries
export type CountryCode = 'GB' | 'DE' | 'FR' | 'NL' | 'ES'
export const SUPPORTED_COUNTRIES: CountryCode[] = ['GB', 'DE', 'FR', 'NL', 'ES']

export const COUNTRY_CURRENCY: Record<CountryCode, string> = {
  GB: 'GBP',
  DE: 'EUR',
  FR: 'EUR',
  NL: 'EUR',
  ES: 'EUR',
}

export const COUNTRY_VAT_RATES: Record<CountryCode, number> = {
  GB: 0.20,
  DE: 0.19,
  FR: 0.20,
  NL: 0.21,
  ES: 0.21,
}

// Socket events
export const SOCKET_EVENTS = {
  CHAT_MESSAGE: 'chat:message',
  CHAT_RESPONSE: 'chat:response',
  CHAT_TYPING: 'chat:typing',
  CHAT_AGENT_TYPING: 'chat:agent_typing',
  CHAT_ESCALATED: 'chat:escalated',
  BOOKING_CONFIRMED: 'booking:confirmed',
  BOOKING_PROVIDER_EN_ROUTE: 'booking:provider_en_route',
  BOOKING_STARTED: 'booking:started',
  BOOKING_COMPLETED: 'booking:completed',
} as const
