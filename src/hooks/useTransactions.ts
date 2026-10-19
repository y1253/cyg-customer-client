import { useQuery } from '@tanstack/react-query'
import { fetchTransactions, TRANSACTIONS_KEY } from '@/api/bookkeeping'
import { useBook } from './useBook'

/**
 * Every ledger row of the customer, newest first. Thousands of rows, so the page fetches
 * them only while the ledger popup is open (`enabled`).
 */
export function useTransactions({ enabled = true }: { enabled?: boolean } = {}) {
  const book = useBook()
  return useQuery({
    queryKey: book.key(TRANSACTIONS_KEY),
    queryFn: () => fetchTransactions(book.auth),
    enabled: !!book.token && enabled,
  })
}
