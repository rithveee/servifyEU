'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

interface Category {
  id: string
  slug: string
  icon: string
  name: string
  description?: string
  serviceCount: number
}

function CategorySkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 animate-pulse">
      <div className="w-10 h-10 bg-gray-200 rounded-lg mb-3" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
    </div>
  )
}

export function ServiceCategoriesGrid() {
  const t = useTranslations('home.categories')
  const locale = useLocale()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['categories', locale],
    queryFn: () =>
      apiClient.get('/services/categories', {
        headers: { 'Accept-Language': locale },
      }),
  })

  const categories: Category[] = data?.data ?? []

  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-900">{t('title')}</h2>
        <p className="text-gray-500 mt-2">{t('subtitle')}</p>
      </div>

      {error && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Failed to load services</p>
          <button
            onClick={() => refetch()}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Try again
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {isLoading
          ? Array.from({ length: 12 }).map((_, i) => <CategorySkeleton key={i} />)
          : categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/${locale}/services/${cat.slug}`}
                className="bg-white rounded-xl p-5 border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group text-center"
              >
                <div className="text-4xl mb-3">{cat.icon}</div>
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-gray-400 mt-1">{cat.serviceCount} services</p>
              </Link>
            ))}
      </div>
    </section>
  )
}
