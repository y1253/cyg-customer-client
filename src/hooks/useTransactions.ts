import { useQuery } from '@tanstack/react-query'
import { fetchTransactions, TRANSACTIONS_KEY } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'

/** Every ledger row of the customer, newest first. */
export function useTransactions() {
  const { token } = useAuth()
  return useQuery({
    queryKey: TRANSACTIONS_KEY,
    queryFn: () => fetchTransactions(token!),
    enabled: !!token,
  })
}
