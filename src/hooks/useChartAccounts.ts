import { useQuery } from '@tanstack/react-query'
import { ACCOUNTS_KEY, fetchAccounts } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'

/** The fixed chart of accounts. It never changes while the app is open. */
export function useChartAccounts() {
  const { token } = useAuth()
  return useQuery({
    queryKey: ACCOUNTS_KEY,
    queryFn: () => fetchAccounts(token!),
    enabled: !!token,
    staleTime: Infinity,
  })
}
