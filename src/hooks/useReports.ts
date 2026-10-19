import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchReports, REPORTS_KEY, type Period } from '@/api/bookkeeping'
import { useBook } from './useBook'

/** Chart of accounts, income statement and balance sheet for a period. */
export function useReports(period: Period, { enabled = true }: { enabled?: boolean } = {}) {
  const book = useBook()
  return useQuery({
    queryKey: [...book.key(REPORTS_KEY), period.from, period.to],
    queryFn: () => fetchReports(book.auth, period),
    enabled: !!book.token && enabled,
    // Keep the last figures on screen while a new period loads.
    placeholderData: keepPreviousData,
  })
}
