import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { setLang, type Lang } from '@/i18n'
import { cn } from '@/lib/utils'

const LANGS: Lang[] = ['fr', 'en']

/**
 * FR | EN — on every header of the site (Quebec's Charter of the French language: the
 * French version is always one click away). `tone="dark"` sits on the navy headers.
 */
export function LanguageSwitch({ tone = 'light', className }: { tone?: 'light' | 'dark'; className?: string }) {
  const { t, i18n } = useTranslation()
  const current: Lang = i18n.resolvedLanguage === 'en' ? 'en' : 'fr'
  return (
    <div
      role="group"
      aria-label={t('lang.switch')}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border p-0.5',
        tone === 'dark' ? 'border-white/25' : 'border-border bg-white',
        className,
      )}
    >
      {LANGS.map((lang) => {
        const active = lang === current
        return (
          <Button
            key={lang}
            variant="ghost"
            size="xs"
            lang={lang}
            aria-pressed={active}
            title={t(`lang.${lang}`)}
            onClick={() => setLang(lang)}
            className={cn(
              'rounded-full px-2.5 font-semibold tracking-wide',
              active
                ? 'bg-brand text-white hover:bg-brand hover:text-white'
                : tone === 'dark'
                  ? 'text-white/70 hover:bg-white/10 hover:text-white'
                  : 'text-muted-foreground',
            )}
          >
            {t(lang === 'fr' ? 'lang.frShort' : 'lang.enShort')}
          </Button>
        )
      })}
    </div>
  )
}
