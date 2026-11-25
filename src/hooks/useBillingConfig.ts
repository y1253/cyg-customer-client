import { useQuery } from '@tanstack/react-query'
import { BILLING_CONFIG_KEY, fetchBillingConfig } from '@/api/billing'
import { useAuth } from '@/context/AuthContext'

/** The plan's price (from Stripe; null while it is not set up). */
export function useBillingConfig(enabled = true) {
  const { token } = useAuth()
  return useQuery({
    queryKey: BILLING_CONFIG_KEY,
    queryFn: () => fetchBillingConfig(token!),
    enabled: !!token && enabled,
    staleTime: 3_600_000,
  })
}
