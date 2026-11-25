import { currentLocale } from '@/i18n'
import { errorFrom, fetchWithAuth } from './client'

/**
 * 2026-11-25: the $19.99/month subscription (it replaced pay-per-Generate). One plan per
 * customer account, covering every book. Stripe Checkout starts it, the Stripe Billing
 * Portal manages it (card, cancel, invoices) — this client only redirects to their URLs.
 * Every route here stays open while the account is locked: it is how a customer unlocks.
 */

/** The plan's price, read from Stripe on the server — never hard-coded here. */
export type PlanPrice = { priceCents: number; currency: string; interval: string }

export type BillingConfig = { price: PlanPrice | null }

export type AccessReason = 'PAID' | 'PAST_DUE' | 'FREE' | 'TRIAL' | 'TRIAL_USED' | 'UNPAID' | 'ENDED' | 'NONE'

export type TrialItem = 'transactions' | 'texts' | 'callMinutes'

export type Allowance = { used: number; limit: number }

/** Who may use the app right now, and how much (the server's `AccessState`). */
export type AccessState = {
  active: boolean
  reason: AccessReason
  /** MONTHLY = paid / free promo (the monthly transaction limit); TRIAL = the free trial's own. */
  limited: 'MONTHLY' | 'TRIAL' | null
  trial: {
    transactions: Allowance
    texts: Allowance
    callMinutes: Allowance
    usedUp: TrialItem[]
  } | null
  monthly: {
    month: string
    used: number
    limit: number
    remaining: number
    warn: boolean
    reached: boolean
    /** The 1st of next month, Toronto time. */
    resetsAt: string
  } | null
  /** The server's English "why is it locked" line (the client words it in the site's language). */
  lockedText: string | null
}

export type BillingTransactionKind =
  | 'SUBSCRIPTION_START'
  | 'RENEWAL'
  | 'PRORATION'
  | 'REFUND'
  | 'DISPUTE'
  | 'FREE_PROMO'

export type BillingTransactionStatus = 'SUCCEEDED' | 'FAILED' | 'ACTION_REQUIRED' | 'REFUNDED' | 'DISPUTED' | 'FREE'

/** One money event — paid, failed (and why), needs 3-D Secure, refunded, disputed, free promo. */
export type BillingTransaction = {
  id: number
  kind: BillingTransactionKind
  status: BillingTransactionStatus
  amountCents: number
  currency: string
  failureMessage: string | null
  declineCode: string | null
  nextRetryAt: string | null
  cardBrand: string | null
  cardLast4: string | null
  hostedInvoiceUrl: string | null
  invoicePdfUrl: string | null
  receiptUrl: string | null
  periodStart: string | null
  periodEnd: string | null
  promoCode: string | null
  occurredAt: string
}

export type SubscriptionStatus =
  | 'INCOMPLETE'
  | 'INCOMPLETE_EXPIRED'
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'UNPAID'
  | 'CANCELED'
  | 'PAUSED'
  | 'NONE'

export type Subscription = {
  access: AccessState
  price: PlanPrice | null
  status: SubscriptionStatus
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  freeUntil: string | null
  freeForever: boolean
  failedSince: string | null
  lastFailureMessage: string | null
  /** The card of the last payment (brand + last 4, never the number). */
  card: { brand: string; last4: string } | null
  hasStripeCustomer: boolean
  /** The latest money events, newest first. */
  transactions: BillingTransaction[]
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

async function ok<T>(res: Response): Promise<T> {
  if (!res.ok) throw await errorFrom(res)
  return res.json() as Promise<T>
}

export async function fetchBillingConfig(token: string): Promise<BillingConfig> {
  return ok(await fetchWithAuth(token, '/api/billing/config'))
}

export async function fetchSubscription(token: string): Promise<Subscription> {
  return ok(await fetchWithAuth(token, '/api/billing/subscription'))
}

/** A Stripe Checkout page for the plan (409 when the plan is already active). */
export async function startSubscribe(token: string): Promise<{ url: string }> {
  return ok(await fetchWithAuth(token, '/api/billing/subscribe', { method: 'POST' }))
}

/** The Stripe Billing Portal (404 before the customer ever reached Stripe). */
export async function openPortal(token: string): Promise<{ url: string }> {
  return ok(await fetchWithAuth(token, '/api/billing/portal', { method: 'POST' }))
}

/** A free-subscription promo code: N months free, or free forever. No card needed. */
export async function redeemPromo(
  token: string,
  promoCode: string,
): Promise<{ freeUntil: string | null; freeForever: boolean }> {
  return ok(await fetchWithAuth(token, '/api/billing/redeem', json('POST', { promoCode })))
}

/** "$19.99" in the price's own currency. */
export function money(cents: number, currency = 'cad'): string {
  return new Intl.NumberFormat(currentLocale(), {
    style: 'currency',
    currency: currency.toUpperCase(),
    currencyDisplay: 'narrowSymbol',
  }).format(cents / 100)
}

/** "Dec 1, 2026" — billing dates are Toronto dates (the month resets there). */
export function billingDate(iso: string): string {
  return new Date(iso).toLocaleDateString(currentLocale(), {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** "12,340" in the site's language. */
export const count = (n: number) => n.toLocaleString(currentLocale())

/**
 * Why no NEW transactions can come in right now, or null: the monthly limit reached
 * (until `resetsAt`) or the trial's transactions used up (until they subscribe).
 */
export function transactionBlock(
  access: AccessState | undefined,
): { kind: 'MONTHLY'; resetsAt: string } | { kind: 'TRIAL' } | null {
  if (!access) return null
  if (access.monthly?.reached) return { kind: 'MONTHLY', resetsAt: access.monthly.resetsAt }
  const tx = access.trial?.transactions
  if (access.limited === 'TRIAL' && tx && tx.used >= tx.limit) return { kind: 'TRIAL' }
  return null
}

export const SUBSCRIPTION_KEY = ['billing', 'subscription'] as const
export const BILLING_CONFIG_KEY = ['billing', 'config'] as const
