import i18n, { currentLocale } from '@/i18n'
import { billingDate, money, type Subscription, type TrialItem } from '@/api/billing'

/** 2026-11-25: words for the subscription, built when called (so they follow a language switch). */

/** "transactions and AI texts" — the trial allowances that ran out, in the site's language. */
export function usedUpList(items: TrialItem[]): string {
  const names = items.map((i) => i18n.t(`dashboard:billing.items.${i}`))
  return new Intl.ListFormat(currentLocale(), { type: 'conjunction' }).format(names)
}

/** Why the account is locked, in the site's language (the server's `lockedText` is English only). */
export function lockedReason(sub: Subscription): string {
  const { access } = sub
  switch (access.reason) {
    case 'TRIAL_USED':
      return i18n.t('dashboard:billing.reason.TRIAL_USED', {
        items: usedUpList(access.trial?.usedUp.length ? access.trial.usedUp : ['transactions']),
      })
    case 'UNPAID':
      return i18n.t('dashboard:billing.reason.UNPAID')
    case 'ENDED':
      return sub.freeUntil
        ? i18n.t('dashboard:billing.reason.endedFree', { date: billingDate(sub.freeUntil) })
        : i18n.t('dashboard:billing.reason.ENDED')
    default:
      return i18n.t('dashboard:billing.reason.NONE')
  }
}

/** The status badge's words and colour (Active / Past due / Free trial / Free until … / Not active). */
export function planStatus(sub: Subscription): { label: string; tone: 'ok' | 'warn' | 'bad' | 'muted' } {
  switch (sub.access.reason) {
    case 'PAID':
      return { label: i18n.t('dashboard:billing.status.PAID'), tone: 'ok' }
    case 'PAST_DUE':
      return { label: i18n.t('dashboard:billing.status.PAST_DUE'), tone: 'bad' }
    case 'TRIAL':
      return { label: i18n.t('dashboard:billing.status.TRIAL'), tone: 'warn' }
    case 'FREE':
      return sub.freeForever || !sub.freeUntil
        ? { label: i18n.t('dashboard:billing.status.freeForever'), tone: 'ok' }
        : { label: i18n.t('dashboard:billing.status.freeUntil', { date: billingDate(sub.freeUntil) }), tone: 'ok' }
    default:
      return { label: i18n.t('dashboard:billing.status.locked'), tone: 'muted' }
  }
}

/** "$19.99 / month" from the price Stripe has (null while billing is not set up). */
export function planPrice(price: Subscription['price']): string | null {
  if (!price) return null
  const known = ['day', 'week', 'month', 'year'] as const
  const interval = (known as readonly string[]).includes(price.interval)
    ? i18n.t(`dashboard:billing.interval.${price.interval as (typeof known)[number]}`)
    : price.interval
  return i18n.t('dashboard:billing.perInterval', { price: money(price.priceCents, price.currency), interval })
}
