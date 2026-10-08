import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchStatements, isBusy, REPORTS_KEY, STATEMENTS_KEY, TRANSACTIONS_KEY } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'

/** The customer's statements. Polls every 4s while any is still being read. */
export function useStatements() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: STATEMENTS_KEY,
    queryFn: async () => {
      const list = await fetchStatements(token!)
      // A statement finishing changes the ledger and the reports too.
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
      void queryClient.invalidateQueries({ queryKey: REPORTS_KEY })
      return list
    },
    enabled: !!token,
    refetchInterval: (q) => (q.state.data?.some(isBusy) ? 4000 : false),
    // Keep polling in a background tab too: somebody who uploads and switches tabs should
    // come back to "Done", not a stale "Reading…". It only runs while something is busy.
    refetchIntervalInBackground: true,
  })
}
