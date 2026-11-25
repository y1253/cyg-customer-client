import { useTranslation } from 'react-i18next'
import { billingDate, count, type AccessState, type TrialItem } from '@/api/billing'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

/** 0–100, full when there is no allowance at all. */
const percent = (used: number, limit: number) => (limit > 0 ? Math.min(100, (used / limit) * 100) : 100)

/** The bar's colour: brand, amber from the warn percent, red at the limit. */
const TONE = {
  ok: '',
  warn: '[&_[data-slot=progress-indicator]]:bg-amber-500',
  full: '[&_[data-slot=progress-indicator]]:bg-red-600',
} as const

/** "12,340 of 30,000 transactions this month · resets Dec 1, 2026" with its bar. */
export function MonthlyMeter({ monthly, className }: { monthly: NonNullable<AccessState['monthly']>; className?: string }) {
  const { t } = useTranslation(['dashboard', 'common'])
  const tone = monthly.reached ? 'full' : monthly.warn ? 'warn' : 'ok'
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
        <span className={cn('font-medium', monthly.reached ? 'text-red-700' : monthly.warn ? 'text-amber-800' : 'text-[#0B1C2C]')}>
          {t('billing.usage.monthly', { used: count(monthly.used), limit: count(monthly.limit) })}
        </span>
        <span className="text-muted-foreground">{t('billing.usage.resets', { date: billingDate(monthly.resetsAt) })}</span>
      </p>
      <Progress value={percent(monthly.used, monthly.limit)} className={TONE[tone]} />
    </div>
  )
}

const TRIAL_ITEMS: TrialItem[] = ['transactions', 'texts', 'callMinutes']

/** The free trial's three allowances, each with its own small bar. */
export function TrialMeters({ trial, className }: { trial: NonNullable<AccessState['trial']>; className?: string }) {
  const { t } = useTranslation(['dashboard', 'common'])
  return (
    <div className={cn('grid gap-3 sm:grid-cols-3', className)}>
      {TRIAL_ITEMS.map((item) => {
        const { used, limit } = trial[item]
        const pct = percent(used, limit)
        const tone = used >= limit ? 'full' : pct >= 80 ? 'warn' : 'ok'
        return (
          <div key={item} className="flex flex-col gap-1.5">
            <span className={cn('text-xs font-medium', tone === 'full' ? 'text-red-700' : 'text-[#0B1C2C]')}>
              {t(`billing.usage.${item}`, { used: count(used), limit: count(limit) })}
            </span>
            <Progress value={pct} className={TONE[tone]} />
          </div>
        )
      })}
    </div>
  )
}
