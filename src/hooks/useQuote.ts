import { useMutation } from '@tanstack/react-query'
import { fetchQuote } from '@/api/billing'
import { useAuth } from '@/context/AuthContext'

/** Applies a promo code: the price the customer would pay with it (or the reason it's refused). */
export function useQuote() {
  const { token } = useAuth()
  return useMutation({ mutationFn: (promoCode: string) => fetchQuote(token!, promoCode) })
}
