'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function HeroSection() {
  const t = useTranslations('home.hero')
  const locale = useLocale()
  const router = useRouter()
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/${locale}/services?q=${encodeURIComponent(query)}`)
  }

  return (
    <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
          {t('title')}
        </h1>
        <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
          {t('subtitle')}
        </p>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="flex-1 px-5 py-4 rounded-xl text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-white"
            aria-label={t('searchPlaceholder')}
          />
          <button
            type="submit"
            className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            {t('searchCta')}
          </button>
        </form>
      </div>
    </section>
  )
}
