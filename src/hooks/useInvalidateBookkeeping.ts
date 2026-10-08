import { useQueryClient } from '@tanstack/react-query'
import { REPORTS_KEY, STATEMENTS_KEY, TAX_KEY, TRANSACTIONS_KEY } from '@/api/bookkeeping'

/** Tax and Generate change everything the page shows: refetch it all. */
export function useInvalidateBookkeeping() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(
      [TAX_KEY, STATEMENTS_KEY, TRANSACTIONS_KEY, REPORTS_KEY].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    )
}
