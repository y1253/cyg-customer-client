import { Loader2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { billingDate, transactionBlock } from '@/api/billing'
import { ApiError } from '@/api/client'
import type { Statement } from '@/api/bookkeeping'
import { MonthlyMeter, TrialMeters } from '@/components/Billing/UsageMeter'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCurrency, useUpdateCurrency } from '@/hooks/useCurrency'
import { useGenerate } from '@/hooks/useGenerate'
import { useSubscription } from '@/hooks/useSubscription'

/**
 * Generate + the home currency. Uploading only stores a statement; Generate reads every
 * statement not read yet. 2026-11-25: Generate is part of the monthly plan (no price per
 * click any more) — it only stops at the plan's transaction limit for the month (or the
 * free trial's), shown here with its meter; the server answers 429 past it.
 * Tax is set per name on the Names tab (there is no switch any more). A statement in
 * another currency is converted to the home one at each day's Bank of Canada rate.
 */
export function GenerateBar({ statements }: { statements: Statement[] }) {
  const { t } = useTranslation(['books', 'common'])
  const generate = useGenerate()
  const subscription = useSubscription()
  const currency = useCurrency()
  const setCurrency = useUpdateCurrency()

  const waiting = statements.filter((s) => s.status === 'UPLOADED').length
  const reading = statements.some((s) => s.status === 'PENDING' || s.status === 'PROCESSING')
  const busy = generate.isPending || reading
  const access = subscription.data?.access
  const block = transactionBlock(access)
  const canGenerate = !busy && waiting > 0 && !block

  const label = reading
    ? t('generate.reading')
    : block
      ? block.kind === 'MONTHLY'
        ? t('generate.limitReached', { date: billingDate(block.resetsAt) })
        : t('generate.trialUsedUp')
      : waiting
        ? t('generate.new', { count: waiting })
        : t('generate.button')

  return (
    <div className="mb-6 rounded-2xl bg-white ring-1 ring-black/5">
      <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#0B1C2C]">
            {waiting ? t('generate.ready', { count: waiting }) : t('generate.upToDate')}
          </p>
          <p className="text-sm text-muted-foreground">
            {waiting ? t('generate.readyHint') : t('generate.upToDateHint')}
          </p>
        </div>
        <label
          className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-1.5 text-sm font-medium text-[#0B1C2C]"
          title={t('generate.homeHint')}
        >
          {t('generate.home')}
          <Select
            value={currency.data?.home ?? null}
            onValueChange={(v) => v && v !== currency.data?.home && setCurrency.mutate(v)}
            disabled={!currency.data || setCurrency.isPending}
          >
            <SelectTrigger size="sm" className="w-20 bg-white">
              <SelectValue placeholder="…">{(v: string | null) => v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(currency.data?.currencies ?? []).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <Button
          disabled={!canGenerate}
          onClick={() =>
            // A 429 = the limit was reached since the page loaded: re-read the meter.
            generate.mutate(undefined, {
              onError: (e) => e instanceof ApiError && e.status === 429 && void subscription.refetch(),
            })
          }
          className="h-10 gap-2 rounded-lg bg-brand px-5 text-white hover:bg-brand/85"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {label}
        </Button>
      </div>
      {access?.monthly && <MonthlyMeter monthly={access.monthly} className="border-t px-5 py-3" />}
      {access?.limited === 'TRIAL' && access.trial && (
        <TrialMeters trial={access.trial} className="border-t px-5 py-3" />
      )}
      {block?.kind === 'TRIAL' && (
        <p className="border-t px-5 py-2.5 text-sm">
          <Link to="/dashboard/subscribe" className="font-medium text-brand hover:underline">
            {t('generate.trialUsedUp')}
          </Link>
        </p>
      )}
      {(generate.error || setCurrency.error) && (
        <p role="alert" className="border-t px-5 py-2.5 text-sm text-destructive">
          {(generate.error ?? setCurrency.error)?.message}
        </p>
      )}
    </div>
  )
}
