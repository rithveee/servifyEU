import { useTranslations } from 'next-intl'

export function HowItWorks() {
  const t = useTranslations('home.howItWorks')

  const steps = [
    {
      number: '1',
      icon: '🔍',
      title: t('step1Title'),
      description: t('step1Desc'),
    },
    {
      number: '2',
      icon: '💳',
      title: t('step2Title'),
      description: t('step2Desc'),
    },
    {
      number: '3',
      icon: '✅',
      title: t('step3Title'),
      description: t('step3Desc'),
    },
  ]

  return (
    <section className="bg-gray-50 py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">{t('title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
                {step.icon}
              </div>
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-xs font-bold">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
