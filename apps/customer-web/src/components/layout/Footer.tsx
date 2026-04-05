import Link from 'next/link'
import { useLocale } from 'next-intl'

export function Footer() {
  const locale = useLocale()

  return (
    <footer className="bg-gray-900 text-gray-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-semibold mb-4">ServifyEU</h3>
            <p className="text-sm">Europe's trusted home services marketplace</p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3 text-sm">Services</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href={`/${locale}/services`} className="hover:text-white">All Services</Link></li>
              <li><Link href={`/${locale}/services/home-cleaning`} className="hover:text-white">Home Cleaning</Link></li>
              <li><Link href={`/${locale}/services/plumbing`} className="hover:text-white">Plumbing</Link></li>
              <li><Link href={`/${locale}/services/electrical`} className="hover:text-white">Electrical</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3 text-sm">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href={`/${locale}/about`} className="hover:text-white">About Us</Link></li>
              <li><Link href={`/${locale}/providers/apply`} className="hover:text-white">Become a Provider</Link></li>
              <li><Link href={`/${locale}/contact`} className="hover:text-white">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3 text-sm">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href={`/${locale}/privacy`} className="hover:text-white">Privacy Policy</Link></li>
              <li><Link href={`/${locale}/terms`} className="hover:text-white">Terms of Service</Link></li>
              <li><Link href={`/${locale}/cookies`} className="hover:text-white">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm">© {new Date().getFullYear()} ServifyEU Ltd. All rights reserved.</p>
          <p className="text-sm">GDPR Compliant · EU Data Residency · Secured by Stripe</p>
        </div>
      </div>
    </footer>
  )
}
