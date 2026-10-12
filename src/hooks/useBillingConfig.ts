import { useQuery } from '@tanstack/react-query'
import { BILLING_CONFIG_KEY, fetchBillingConfig } from '@/api/billing'
import { useAuth } from '@/context/AuthContext'

/** The admin's Generate price (0 = free) and Stripe's publishable key. */
export function useBillingConfig() {
  const { token } = useAuth()
  return useQuery({
    queryKey: BILLING_CONFIG_KEY,
    queryFn: () => fetchBillingConfig(token!),
    enabled: !!token,
  })
}
