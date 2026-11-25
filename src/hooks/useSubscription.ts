import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSubscription, openPortal, redeemPromo, startSubscribe, SUBSCRIPTION_KEY } from '@/api/billing'
import { useAuth } from '@/context/AuthContext'

/**
 * 2026-11-25: the customer's plan and access (paid / past due / free / trial / locked), this
 * month's transactions, the trial's allowances and the payment history. Refetched when the
 * tab comes back (the customer may have paid in Stripe's tab) — the dashboard shell reads
 * it to lock or unlock every page.
 */
export function useSubscription() {
  const { token } = useAuth()
  return useQuery({
    queryKey: SUBSCRIPTION_KEY,
    queryFn: () => fetchSubscription(token!),
    enabled: !!token,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  })
}

/** Opens Stripe Checkout for the plan (the browser leaves the site). */
export function useSubscribe() {
  const { token } = useAuth()
  return useMutation({
    mutationFn: () => startSubscribe(token!),
    onSuccess: ({ url }) => {
      window.location.href = url
    },
  })
}

/** Opens the Stripe Billing Portal: the card, cancelling, invoices. */
export function useOpenPortal() {
  const { token } = useAuth()
  return useMutation({
    mutationFn: () => openPortal(token!),
    onSuccess: ({ url }) => {
      window.location.href = url
    },
  })
}

/** Redeems a free-subscription code; an unlocked account refetches everything. */
export function useRedeemPromo() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (promoCode: string) => redeemPromo(token!, promoCode),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: SUBSCRIPTION_KEY })
      void qc.invalidateQueries()
    },
  })
}
