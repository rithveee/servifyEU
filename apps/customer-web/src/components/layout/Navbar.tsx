'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'
import { useRouter } from 'next/navigation'

const LOCALES = [
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'fr', label: 'FR' },
  { code: 'nl', label: 'NL' },
  { code: 'es', label: 'ES' },
]

export function Navbar() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const router = useRouter()
  const { isAuthenticated, user, logout, refreshToken } = useAuthStore()

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken })
      }
    } catch {}
    logout()
    router.push(`/${locale}`)
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={`/${locale}`} className="text-xl font-bold text-blue-600">
            ServifyEU
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href={`/${locale}/services`} className="text-sm text-gray-600 hover:text-gray-900">
              {t('services')}
            </Link>
            {isAuthenticated && (
              <Link href={`/${locale}/bookings`} className="text-sm text-gray-600 hover:text-gray-900">
                {t('bookings')}
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Locale switcher */}
            <div className="hidden sm:flex items-center gap-1">
              {LOCALES.map((l) => (
                <Link
                  key={l.code}
                  href={`/${l.code}`}
                  className={`text-xs px-2 py-1 rounded ${
                    locale === l.code
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  aria-label={`Switch to ${l.label}`}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  href={`/${locale}/account`}
                  className="text-sm text-gray-600 hover:text-gray-900"
                  aria-label={t('account')}
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-blue-700">
                      {user?.firstName?.[0]?.toUpperCase() ?? 'U'}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  {t('signOut')}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href={`/${locale}/auth/login`}
                  className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2"
                >
                  {t('signIn')}
                </Link>
                <Link
                  href={`/${locale}/auth/register`}
                  className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
