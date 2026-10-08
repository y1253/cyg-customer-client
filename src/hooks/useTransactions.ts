import { useQuery } from '@tanstack/react-query'
import { fetchTransactions, TRANSACTIONS_KEY } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'

/**
 * Every ledger row of the customer, newest first. Thousands of rows, so the page fetches
 * them only while the ledger popup is open (`enabled`).
 */
export function useTransactions({ enabled = true }: { enabled?: boolean } = {}) {
  const { token } = useAuth()
  return useQuery({
    queryKey: TRANSACTIONS_KEY,
    queryFn: () => fetchTransactions(token!),
    enabled: !!token && enabled,
  })
}
