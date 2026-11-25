import { CreditCard, ExternalLink, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { billingDate, money, type BillingTransaction, type BillingTransactionStatus } from '@/api/billing'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useOpenPortal, useSubscription } from '@/hooks/useSubscription'
import { planPrice, planStatus } from '@/lib/billing'
import { cn } from '@/lib/utils'
import { MonthlyMeter, TrialMeters } from './UsageMeter'

const BADGE_TONE = {
  ok: 'bg-emerald-100 text-emerald-800',
  warn: 'bg-amber-100 text-amber-800',
  bad: 'bg-red-100 text-red-700',
  muted: 'bg-muted text-muted-foreground',
} as const

const TX_TONE: Record<BillingTransactionStatus, string> = {
  SUCCEEDED: BADGE_TONE.ok,
  FREE: BADGE_TONE.ok,
  FAILED: BADGE_TONE.bad,
  DISPUTED: BADGE_TONE.bad,
  ACTION_REQUIRED: BADGE_TONE.warn,
  REFUNDED: BADGE_TONE.muted,
}

/** "Visa •••• 4242" — Stripe gives only the brand and the last 4. */
const cardName = (brand: string, last4: string) => `${brand.charAt(0).toUpperCase()}${brand.slice(1)} •••• ${last4}`

/**
 * Account page (2026-11-25, replaced the saved cards): the plan's status, the next billing
 * date, the card, the trial's allowances or this month's transactions, "Manage billing"
 * (the Stripe Billing Portal) and every payment — failed ones with Stripe's reason.
 */
export function SubscriptionCard() {
  const { t } = useTranslation(['dashboard', 'common'])
  const sub = useSubscription()
  const portal = useOpenPortal()
  const data = sub.data

  return (
    <Card className="mt-6 max-w-2xl rounded-2xl border-0 py-8 shadow-sm ring-1 ring-black/5">
      <CardHeader className="px-8">
        <CardTitle className="text-lg font-bold text-[#0B1C2C]">{t('billing.card.title')}</CardTitle>
        <CardDescription>{t('billing.card.description')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 px-8">
        {sub.isLoading ? (
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        ) : sub.error || !data ? (
          <p role="alert" className="text-sm text-destructive">
            {sub.error?.message}
          </p>
        ) : (
          <>
            <PlanSummary data={data} />

            <div className="flex flex-wrap gap-2">
              {data.hasStripeCustomer && (
                <Button variant="outline" disabled={portal.isPending} onClick={() => portal.mutate()}>
                  {portal.isPending ? <Loader2 className="animate-spin" /> : <CreditCard />}
                  {portal.isPending ? t('billing.opening') : t('billing.manage')}
                </Button>
              )}
              {data.access.reason !== 'PAID' && data.access.reason !== 'PAST_DUE' && data.access.reason !== 'FREE' && (
                <Button
                  className="bg-brand text-white hover:bg-brand/85"
                  render={<Link to="/dashboard/subscribe" />}
                  nativeButton={false}
                >
                  {t('billing.subscribe')}
                </Button>
              )}
            </div>
            {portal.error && (
              <p role="alert" className="text-sm text-destructive">
                {portal.error.message}
              </p>
            )}

            {data.access.trial && (
              <div className="grid gap-2">
                <p className="text-xs text-muted-foreground">{t('billing.card.trialHint')}</p>
                <TrialMeters trial={data.access.trial} />
              </div>
            )}
            {data.access.monthly && <MonthlyMeter monthly={data.access.monthly} />}

            <History transactions={data.transactions} />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function PlanSummary({ data }: { data: NonNullable<ReturnType<typeof useSubscription>['data']> }) {
  const { t } = useTranslation(['dashboard', 'common'])
  const status = planStatus(data)
  const price = planPrice(data.price)
  const paid = data.access.reason === 'PAID' || data.access.reason === 'PAST_DUE'
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-muted/50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cn('rounded-md', BADGE_TONE[status.tone])}>{status.label}</Badge>
        {price && paid && <span className="text-sm font-semibold text-[#0B1C2C]">{price}</span>}
      </div>
      {paid && data.currentPeriodEnd && (
        <p className="text-sm text-muted-foreground">
          {data.cancelAtPeriodEnd
            ? t('billing.card.cancels', { date: billingDate(data.currentPeriodEnd) })
            : t('billing.card.renews', { date: billingDate(data.currentPeriodEnd) })}
        </p>
      )}
      {data.card && (
        <p className="flex items-center gap-2 text-sm text-[#0B1C2C]">
          <CreditCard className="size-4 text-muted-foreground" />
          {cardName(data.card.brand, data.card.last4)}
        </p>
      )}
      {data.access.reason === 'PAST_DUE' && data.lastFailureMessage && (
        <p className="text-sm text-red-700">{data.lastFailureMessage}</p>
      )}
    </div>
  )
}

/** Every money event, newest first: paid, failed (why, next try), needs action, refunds. */
function History({ transactions }: { transactions: BillingTransaction[] }) {
  const { t } = useTranslation(['dashboard', 'common'])
  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold text-[#0B1C2C]">{t('billing.card.history')}</p>
      {transactions.length === 0 ? (
        <p className="rounded-xl bg-muted/50 px-4 py-5 text-center text-sm text-muted-foreground">
          {t('billing.card.empty')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('billing.card.date')}</TableHead>
              <TableHead>{t('billing.card.what')}</TableHead>
              <TableHead className="text-right">{t('billing.card.amount')}</TableHead>
              <TableHead>{t('billing.card.statusCol')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id} className="align-top">
                <TableCell className="whitespace-nowrap">{billingDate(tx.occurredAt)}</TableCell>
                <TableCell className="whitespace-normal">
                  <p>{t(`billing.kind.${tx.kind}`)}</p>
                  {tx.promoCode && <p className="text-xs text-muted-foreground">{tx.promoCode}</p>}
                  {tx.cardBrand && tx.cardLast4 && (
                    <p className="text-xs text-muted-foreground">{cardName(tx.cardBrand, tx.cardLast4)}</p>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(tx.amountCents, tx.currency)}</TableCell>
                <TableCell className="whitespace-normal">
                  <Badge className={cn('rounded-md', TX_TONE[tx.status])}>{t(`billing.txStatus.${tx.status}`)}</Badge>
                  {tx.status === 'FAILED' && tx.failureMessage && (
                    <p className="mt-1 max-w-56 text-xs text-red-700">{tx.failureMessage}</p>
                  )}
                  {tx.status === 'FAILED' && tx.nextRetryAt && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t('billing.card.nextTry', { date: billingDate(tx.nextRetryAt) })}
                    </p>
                  )}
                  <div className="mt-1 flex flex-col gap-0.5 text-xs">
                    {tx.status === 'ACTION_REQUIRED' && tx.hostedInvoiceUrl && (
                      <DocLink href={tx.hostedInvoiceUrl} label={t('billing.card.completePayment')} strong />
                    )}
                    {tx.receiptUrl && <DocLink href={tx.receiptUrl} label={t('billing.card.receipt')} />}
                    {tx.invoicePdfUrl && <DocLink href={tx.invoicePdfUrl} label={t('billing.card.invoice')} />}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function DocLink({ href, label, strong = false }: { href: string; label: string; strong?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('inline-flex items-center gap-1 text-brand hover:underline', strong && 'font-semibold')}
    >
      {label} <ExternalLink className="size-3" />
    </a>
  )
}
