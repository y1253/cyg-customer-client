import { errorFrom, fetchWithAuth } from './client'

/** The admin's Generate price and Stripe's publishable key. `priceCents` 0 = Generate is free. */
export type BillingConfig = {
  publishableKey: string | null
  priceCents: number
  currency: string
}

export type PromoKind = 'FIXED_PRICE' | 'PERCENT_OFF'

/** What one Generate costs, with or without a promo code. Display only — the server recomputes it. */
export type Quote = {
  listPriceCents: number
  amountCents: number
  currency: string
  promo: { code: string; kind: PromoKind; value: number } | null
}

/** A card Stripe saved on the customer's first payment (never the number — brand + last 4). */
export type SavedCard = {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

export type GenerateResult = { queued: number; taxing: boolean }

/** `done` = paid (or free) and reading started; otherwise confirm the card with Stripe.js. */
export type CheckoutResult =
  | { done: true; amountCents: number; result: GenerateResult }
  | { done: false; amountCents: number; clientSecret: string; paymentIntentId: string; status: string }

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

export async function fetchQuote(token: string, promoCode?: string): Promise<Quote> {
  return ok(await fetchWithAuth(token, '/api/billing/quote', json('POST', { promoCode })))
}

export async function fetchCards(token: string): Promise<SavedCard[]> {
  return ok(await fetchWithAuth(token, '/api/billing/cards'))
}

export async function removeCard(token: string, id: string): Promise<void> {
  const res = await fetchWithAuth(token, `/api/billing/cards/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw await errorFrom(res)
}

export async function checkout(
  token: string,
  body: { promoCode?: string; paymentMethodId?: string },
): Promise<CheckoutResult> {
  return ok(await fetchWithAuth(token, '/api/billing/checkout', json('POST', body)))
}

export async function completePayment(token: string, paymentIntentId: string): Promise<GenerateResult> {
  return ok(await fetchWithAuth(token, '/api/billing/complete', json('POST', { paymentIntentId })))
}

/** "$12.50" in the price's own currency. */
export function money(cents: number, currency = 'cad'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency.toUpperCase(),
    currencyDisplay: 'narrowSymbol',
  }).format(cents / 100)
}

export const BILLING_CONFIG_KEY = ['billing', 'config'] as const
export const CARDS_KEY = ['billing', 'cards'] as const
