import type { SavedCard } from '@/api/billing'

/** How a saved card is named — Stripe gives only the brand, last 4 and expiry. */
const BRAND_LABEL: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
}

export function cardLabel(card: Pick<SavedCard, 'brand' | 'last4'>) {
  return `${BRAND_LABEL[card.brand] ?? card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} •••• ${card.last4}`
}

export function cardExpiry(card: Pick<SavedCard, 'expMonth' | 'expYear'>) {
  return `${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`
}
