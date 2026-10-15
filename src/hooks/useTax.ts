import { useQuery } from '@tanstack/react-query'
import { fetchTax, TAX_KEY } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'

/** The customer's tax agencies (which names they tax is on the Names tab). */
export function useTax() {
  const { token } = useAuth()
  return useQuery({
    queryKey: TAX_KEY,
    queryFn: () => fetchTax(token!),
    enabled: !!token,
  })
}
