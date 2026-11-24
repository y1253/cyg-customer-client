import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { currentLocale } from '@/i18n'

/** Shared shell for the public policy pages (privacy, security). */
export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string
  /** YYYY-MM-DD — shown in the page's language. */
  updated: string
  children: ReactNode
}) {
  const { t } = useTranslation('legal')
  const date = new Date(updated + 'T00:00:00').toLocaleDateString(currentLocale(), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-10 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-brand hover:opacity-80">
            <ArrowLeft size={15} />
            {t('back')}
          </Link>
          <LanguageSwitch />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-ink">{title}</h1>
        <p className="mb-10 text-sm text-gray-500">{t('updated', { date })}</p>
        <div className="space-y-8 text-[15px] leading-relaxed text-gray-700">{children}</div>
        <div className="mt-14 border-t border-gray-100 pt-8 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} CYG Finance ·{' '}
          <Link to="/privacy" className="text-brand hover:opacity-80">{t('privacyTitle')}</Link> ·{' '}
          <Link to="/security-policy" className="text-brand hover:opacity-80">{t('securityLink')}</Link>
        </div>
      </div>
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  )
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-6">{children}</ul>
}

export function LegalContact() {
  return (
    <p>
      <a href="mailto:office@cygfinance.com" className="text-brand underline">office@cygfinance.com</a>
      <br />
      CYG Finance, 867, avenue McEachran, Outremont (Québec) H2V 3C9, Canada
      <br />
      <a href="tel:+18552943462" className="text-brand underline">855-294-3462</a>
    </p>
  )
}
