import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { Navbar } from '@/components/layout/Navbar'
import { HeroSection } from '@/components/home/HeroSection'
import { ServiceCategoriesGrid } from '@/components/home/ServiceCategoriesGrid'
import { HowItWorks } from '@/components/home/HowItWorks'
import { TrustBadges } from '@/components/home/TrustBadges'
import { Footer } from '@/components/layout/Footer'

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'home.hero' })
  return {
    title: `ServifyEU — ${t('title')}`,
  }
}

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <TrustBadges />
        <ServiceCategoriesGrid />
        <HowItWorks />
      </main>
      <Footer />
    </>
  )
}
