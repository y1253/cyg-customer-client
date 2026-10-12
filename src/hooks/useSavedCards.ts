import { useQuery } from '@tanstack/react-query'
import { CARDS_KEY, fetchCards } from '@/api/billing'
import { useAuth } from '@/context/AuthContext'

/** Cards saved on the customer's Stripe account, newest first. */
export function useSavedCards(enabled = true) {
  const { token } = useAuth()
  return useQuery({
    queryKey: CARDS_KEY,
    queryFn: () => fetchCards(token!),
    enabled: !!token && enabled,
  })
}
