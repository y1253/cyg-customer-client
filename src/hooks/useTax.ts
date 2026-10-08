import { useQuery } from '@tanstack/react-query'
import { fetchTax, TAX_KEY } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'

/** Sales-tax switch + agencies. Polls every 4s while a tax run is in progress. */
export function useTax() {
  const { token } = useAuth()
  return useQuery({
    queryKey: TAX_KEY,
    queryFn: () => fetchTax(token!),
    enabled: !!token,
    refetchInterval: (q) => (q.state.data?.running ? 4000 : false),
  })
}
