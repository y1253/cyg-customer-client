import { useQuery } from '@tanstack/react-query'
import { ACCOUNTS_KEY, fetchAccounts } from '@/api/bookkeeping'
import { useBook } from './useBook'

/** The fixed chart of accounts plus the customer's own categories. */
export function useChartAccounts() {
  const book = useBook()
  return useQuery({
    queryKey: book.key(ACCOUNTS_KEY),
    queryFn: () => fetchAccounts(book.auth),
    enabled: !!book.token,
    staleTime: 5 * 60_000,
  })
}
