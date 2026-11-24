import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { useAuth } from '@/context/AuthContext'
import { CONTACT, NAV_LINKS } from './content'
import { ctaClass } from './cta'

const LINK = 'mb-3 block text-base text-white/50 transition-opacity hover:text-white'
const TITLE = 'mb-6 text-xl font-extrabold'

export function SiteFooter() {
  const { token } = useAuth()
  const { t } = useTranslation(['site', 'common'])
  return (
    <footer className="bg-ink pb-8 text-white">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <div className="flex flex-col gap-8 py-16 lg:flex-row lg:items-end lg:justify-between">
          <h3 className="max-w-2xl text-[30px] font-bold leading-[1.2] tracking-[-0.02em] lg:text-[44px]">
            <Trans t={t} i18nKey="footer.tagline" components={{ hl: <span className="text-brand-light" /> }} />
          </h3>
          <div className="flex flex-wrap gap-4">
            <Link to={token ? '/dashboard' : '/signup'} className={ctaClass('light')}>
              {token ? t('hero.goToDashboard') : t('hero.getStarted')}
            </Link>
            <a href="#contact" className={ctaClass('brand')}>
              {t('nav.contactUs')}
            </a>
          </div>
        </div>

        <div className="grid gap-10 border-t border-white/10 pt-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:pt-16">
          <a href="#top" aria-label={t('common:nav.home')}>
            <img src="/site/logo.png" alt="CYG Finance" className="w-[164px] brightness-0 invert" />
          </a>
          <div>
            <div className={TITLE}>{t('footer.company')}</div>
            <a href="#top" className={LINK}>{t('footer.home')}</a>
            <a href="#what-we-do" className={LINK}>{t('nav.howItWorks')}</a>
            <a href="#contact" className={LINK}>{t('footer.contact')}</a>
            <a href="/privacy" className={LINK}>{t('footer.privacy')}</a>
            <a href="/security-policy" className={LINK}>{t('footer.security')}</a>
          </div>
          <div>
            <div className={TITLE}>{t('footer.siteMap')}</div>
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className={LINK}>
                {t(`nav.${l.key}`)}
              </a>
            ))}
          </div>
          <div>
            <div className={TITLE}>{t('footer.contact')}</div>
            <a href={`mailto:${CONTACT.email}`} className={LINK}>
              {CONTACT.email}
            </a>
            <a href={CONTACT.phoneHref} className={LINK}>
              {t('footer.phone')}
              <br />
              (855-294-3462)
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/50">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          <LanguageSwitch tone="dark" />
        </div>
      </div>
    </footer>
  )
}
