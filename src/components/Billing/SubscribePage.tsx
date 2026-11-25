import { useEffect, useState, type FormEvent } from 'react'
import { Check, CheckCircle2, Loader2, Lock, RefreshCw, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { fetchSubscription, SUBSCRIPTION_KEY } from '@/api/billing'
import { PageHeader } from '@/components/Dashboard/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { useBillingConfig } from '@/hooks/useBillingConfig'
import { useRedeemPromo, useSubscribe, useSubscription } from '@/hooks/useSubscription'
import { lockedReason, planPrice, planStatus } from '@/lib/billing'

const FEATURES = ['books', 'ai', 'bank', 'receipts', 'reports', 'cancel'] as const

/** Stripe's webhook usually lands within seconds of Checkout; wait this long before giving up. */
const POLL_MS = 2_000
const POLL_FOR_MS = 30_000

/**
 * `/dashboard/subscribe` (2026-11-25): the one page a LOCKED account sees (with My account).
 * The plan from Stripe's price, Subscribe → Stripe Checkout, a free-subscription promo
 * code, and why it is locked. Stripe sends the customer back with `?done=1`: the page then
 * waits for the webhook to open the plan and goes on to Bookkeeping.
 */
export function SubscribePage() {
  const { t } = useTranslation(['dashboard', 'common'])
  const [params] = useSearchParams()
  const sub = useSubscription()

  if (params.get('done') === '1') return <Finishing />

  return (
    <>
      <PageHeader title={t('billing.page.title')} description={t('billing.page.description')} />
      {sub.isLoading ? (
        <div className="h-80 max-w-2xl animate-pulse rounded-2xl bg-white ring-1 ring-black/5" />
      ) : sub.data?.access.active ? (
        <ActivePlan />
      ) : (
        <PlanOffer />
      )}
    </>
  )
}

/** The plan, why the account is locked, Subscribe, and the promo field. */
function PlanOffer() {
  const { t } = useTranslation(['dashboard', 'common'])
  const sub = useSubscription()
  // The subscription carries the price; the config is its fallback when that read failed.
  const config = useBillingConfig(!sub.data)
  const subscribe = useSubscribe()
  const price = planPrice(sub.data?.price ?? config.data?.price ?? null)

  return (
    <Card className="max-w-2xl rounded-2xl border-0 py-8 shadow-sm ring-1 ring-black/5">
      <CardHeader className="px-8">
        {sub.data && (
          <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-amber-600/20">
            <Lock className="mt-0.5 size-4 shrink-0" />
            {lockedReason(sub.data)}
          </p>
        )}
        <CardDescription className="font-medium text-brand">{t('billing.page.plan')}</CardDescription>
        <CardTitle className="text-3xl font-bold tracking-[-0.02em] text-[#0B1C2C]">
          {price ?? t('billing.page.notSetUp')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 px-8">
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-[#0B1C2C]">
              <Check className="mt-0.5 size-4 shrink-0 text-brand" />
              {t(`billing.page.features.${f}`)}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <Button
            disabled={!price || subscribe.isPending || subscribe.isSuccess}
            onClick={() => subscribe.mutate()}
            className="h-11 gap-2 rounded-lg bg-brand text-base text-white hover:bg-brand/85"
          >
            {subscribe.isPending || subscribe.isSuccess ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {subscribe.isPending || subscribe.isSuccess ? t('billing.opening') : t('billing.subscribe')}
          </Button>
          <p className="text-xs text-muted-foreground">{t('billing.page.secured')}</p>
          {subscribe.error && (
            <p role="alert" className="text-sm text-destructive">
              {subscribe.error.message}
            </p>
          )}
        </div>

        <PromoField />
      </CardContent>
    </Card>
  )
}

/** "Have a promo code?" — a free subscription (N months or forever), no card. */
function PromoField() {
  const { t } = useTranslation(['dashboard', 'common'])
  const navigate = useNavigate()
  const redeem = useRedeemPromo()
  const [code, setCode] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const promoCode = code.trim()
    if (!promoCode) return
    redeem.mutate(promoCode, {
      // A moment to read the confirmation, then into the app.
      onSuccess: () => setTimeout(() => navigate('/dashboard/bookkeeping', { replace: true }), 1_200),
    })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2 border-t pt-5">
      <label htmlFor="promo" className="text-sm font-semibold text-[#0B1C2C]">
        {t('billing.promo.have')}
      </label>
      <div className="flex gap-2">
        <Input
          id="promo"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t('billing.promo.placeholder')}
          autoComplete="off"
          className="h-10 uppercase placeholder:normal-case"
          disabled={redeem.isPending || redeem.isSuccess}
        />
        <Button type="submit" variant="outline" className="h-10" disabled={!code.trim() || redeem.isPending || redeem.isSuccess}>
          {redeem.isPending && <Loader2 className="animate-spin" />}
          {t('billing.promo.apply')}
        </Button>
      </div>
      {redeem.error && (
        <p role="alert" className="text-sm text-destructive">
          {redeem.error.message}
        </p>
      )}
      {redeem.isSuccess && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="size-4" /> {t('billing.page.redeemed')}
        </p>
      )}
    </form>
  )
}

/** Someone with an open plan opened the page: what they have, and the way back. */
function ActivePlan() {
  const { t } = useTranslation(['dashboard', 'common'])
  const sub = useSubscription()
  if (!sub.data) return null
  const status = planStatus(sub.data)
  return (
    <Card className="max-w-2xl rounded-2xl border-0 py-8 shadow-sm ring-1 ring-black/5">
      <CardHeader className="px-8">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-[#0B1C2C]">
          <CheckCircle2 className="size-5 text-emerald-600" /> {t('billing.page.activeTitle')}
        </CardTitle>
        <CardDescription>{status.label}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 px-8">
        <Button className="bg-brand text-white hover:bg-brand/85" render={<Link to="/dashboard/bookkeeping" />} nativeButton={false}>
          {t('billing.page.back')}
        </Button>
        <Button variant="outline" render={<Link to="/dashboard/account" />} nativeButton={false}>
          {t('nav.account')}
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Back from Stripe Checkout (`?done=1`): asks every 2 s, for up to 30 s, until the
 * webhook has opened the plan, then goes to Bookkeeping. Slower than that = a note and a
 * Refresh button (the hourly sync on the server catches a lost webhook).
 */
function Finishing() {
  const { t } = useTranslation(['dashboard', 'common'])
  const { token } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [timedOut, setTimedOut] = useState(false)
  const [round, setRound] = useState(0)

  useEffect(() => {
    if (!token) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const started = Date.now()
    const check = async () => {
      try {
        const sub = await fetchSubscription(token)
        if (stopped) return
        qc.setQueryData(SUBSCRIPTION_KEY, sub)
        if (sub.access.active) {
          // Whatever was fetched while locked (errors) is fetched again.
          void qc.invalidateQueries()
          navigate('/dashboard/bookkeeping', { replace: true })
          return
        }
      } catch {
        // A blip — the next round asks again.
      }
      if (stopped) return
      if (Date.now() - started >= POLL_FOR_MS) setTimedOut(true)
      else timer = setTimeout(check, POLL_MS)
    }
    void check()
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [token, qc, navigate, round])

  return (
    <Card className="mx-auto mt-10 max-w-md rounded-2xl border-0 py-10 text-center shadow-sm ring-1 ring-black/5">
      <CardContent className="flex flex-col items-center gap-4 px-8">
        {timedOut ? (
          <>
            <p className="text-base font-semibold text-[#0B1C2C]">{t('billing.page.finishingSlow')}</p>
            <Button variant="outline" onClick={() => {
                setTimedOut(false)
                setRound((r) => r + 1)
              }}>
              <RefreshCw /> {t('billing.page.refresh')}
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="size-8 animate-spin text-brand" />
            <p className="text-base font-semibold text-[#0B1C2C]">{t('billing.page.finishing')}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
