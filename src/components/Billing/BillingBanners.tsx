import { AlertTriangle, CreditCard, Loader2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { billingDate, count, money, type Subscription } from '@/api/billing'
import { Button } from '@/components/ui/button'
import { useOpenPortal } from '@/hooks/useSubscription'

/**
 * 2026-11-25: the notes above every dashboard page of an OPEN account — a failed renewal
 * (Stripe is still retrying: the grace period), the free trial's allowances, and this
 * month's transactions near or at the limit.
 */
export function BillingBanners({ sub }: { sub: Subscription }) {
  const { t } = useTranslation(['dashboard', 'common'])
  const portal = useOpenPortal()
  const { access } = sub
  if (!access.active) return null

  // What failed: the newest failed attempt's amount, else the plan's price.
  const failed = sub.transactions.find((x) => x.status === 'FAILED')
  const amount = failed
    ? money(failed.amountCents, failed.currency)
    : sub.price
      ? money(sub.price.priceCents, sub.price.currency)
      : null
  const trial = access.trial
  const monthly = access.monthly

  return (
    <div className="mb-6 flex flex-col gap-2 empty:hidden">
      {access.reason === 'PAST_DUE' && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-600/20 sm:flex-row sm:items-center"
        >
          <AlertTriangle className="hidden size-5 shrink-0 sm:block" />
          <p className="min-w-0 flex-1 font-medium">
            {sub.failedSince && amount
              ? t('billing.banner.pastDue', { amount, date: billingDate(sub.failedSince) })
              : t('billing.banner.pastDueNoDate')}
          </p>
          {sub.hasStripeCustomer && (
            <Button
              size="sm"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={portal.isPending}
              onClick={() => portal.mutate()}
            >
              {portal.isPending ? <Loader2 className="animate-spin" /> : <CreditCard />}
              {t('billing.manage')}
            </Button>
          )}
        </div>
      )}
      {portal.error && <p className="text-sm text-destructive">{portal.error.message}</p>}

      {access.reason === 'TRIAL' && trial && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-white px-4 py-2 text-sm text-[#0B1C2C] ring-1 ring-black/5">
          <Sparkles className="size-4 shrink-0 text-brand" />
          <p className="min-w-0 flex-1">
            {t('billing.banner.trial', {
              transactions: `${count(trial.transactions.used)}/${count(trial.transactions.limit)}`,
              texts: `${count(trial.texts.used)}/${count(trial.texts.limit)}`,
              calls: `${count(trial.callMinutes.used)}/${count(trial.callMinutes.limit)}`,
            })}
          </p>
          <Button
            size="sm"
            className="bg-brand text-white hover:bg-brand/85"
            render={<Link to="/dashboard/subscribe" />}
            nativeButton={false}
          >
            {t('billing.subscribe')}
          </Button>
        </div>
      )}

      {monthly && (monthly.reached || monthly.warn) && (
        <p
          className={
            monthly.reached
              ? 'flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-800 ring-1 ring-red-600/20'
              : 'flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-900 ring-1 ring-amber-600/20'
          }
        >
          <AlertTriangle className="size-4 shrink-0" />
          {monthly.reached
            ? t('billing.banner.monthlyReached', { limit: count(monthly.limit), date: billingDate(monthly.resetsAt) })
            : t('billing.banner.monthlyWarn', { used: count(monthly.used), limit: count(monthly.limit) })}
        </p>
      )}
    </div>
  )
}
