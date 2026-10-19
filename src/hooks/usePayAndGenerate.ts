import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CARDS_KEY, checkout, completePayment, type GenerateResult } from '@/api/billing'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

export type PayInput = {
  promoCode?: string
  /** A saved card to charge; absent = the new card in the Payment Element. */
  paymentMethodId?: string
  /** Runs BEFORE the server makes the PaymentIntent (validates the Payment Element). */
  prepare?: () => Promise<void>
  /** Finishes the card with Stripe.js (new card, or 3-D Secure on a saved one). Throws on decline. */
  confirm: (clientSecret: string, savedCard: boolean) => Promise<void>
}

/**
 * Pay for one Generate, then read the statements: checkout → (card confirm) → complete.
 * A $0 total (free promo) is `done` straight from checkout — no card is touched.
 */
export function usePayAndGenerate() {
  const book = useBook()
  const qc = useQueryClient()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: async ({ promoCode, paymentMethodId, prepare, confirm }: PayInput): Promise<GenerateResult> => {
      // Stripe wants the Payment Element validated before the intent exists.
      if (!paymentMethodId) await prepare?.()
      const res = await checkout(book.auth, { promoCode, paymentMethodId })
      if (res.done) return res.result
      await confirm(res.clientSecret, !!paymentMethodId)
      return completePayment(book.auth, res.paymentIntentId)
    },
    onSettled: async () => {
      await Promise.all([invalidate(), qc.invalidateQueries({ queryKey: CARDS_KEY })])
    },
  })
}
