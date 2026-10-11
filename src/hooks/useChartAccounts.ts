import { useQuery } from '@tanstack/react-query'
import { ACCOUNTS_KEY, fetchAccounts } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'

/** The fixed chart of accounts plus the customer's own categories. */
export function useChartAccounts() {
  const { token } = useAuth()
  return useQuery({
    queryKey: ACCOUNTS_KEY,
    queryFn: () => fetchAccounts(token!),
    enabled: !!token,
    staleTime: 5 * 60_000,
  })
}
