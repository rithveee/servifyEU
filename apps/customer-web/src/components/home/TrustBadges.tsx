import { useTranslations } from 'next-intl'

export function TrustBadges() {
  const t = useTranslations('home.trust')

  const badges = [
    { icon: '👷', label: t('providers') },
    { icon: '🌍', label: t('countries') },
    { icon: '⭐', label: t('rating') },
    { icon: '✅', label: t('bookings') },
  ]

  return (
    <section className="bg-white border-b border-gray-100 py-6 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap justify-center gap-8">
          {badges.map((badge) => (
            <div key={badge.label} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-xl">{badge.icon}</span>
              <span className="font-medium">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
