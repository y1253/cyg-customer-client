import { useQuery } from '@tanstack/react-query'
import { fetchNames, NAMES_KEY } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'

/** Every payee name the AI read, with its category, type and tax switch. */
export function useNames() {
  const { token } = useAuth()
  return useQuery({
    queryKey: NAMES_KEY,
    queryFn: () => fetchNames(token!),
    enabled: !!token,
  })
}
