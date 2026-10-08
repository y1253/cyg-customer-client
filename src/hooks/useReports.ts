import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchReports, REPORTS_KEY, type Period } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'

/** Chart of accounts, income statement and balance sheet for a period. */
export function useReports(period: Period, { enabled = true }: { enabled?: boolean } = {}) {
  const { token } = useAuth()
  return useQuery({
    queryKey: [...REPORTS_KEY, period.from, period.to],
    queryFn: () => fetchReports(token!, period),
    enabled: !!token && enabled,
    // Keep the last figures on screen while a new period loads.
    placeholderData: keepPreviousData,
  })
}
