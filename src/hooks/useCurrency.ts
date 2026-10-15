import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CURRENCY_KEY, fetchCurrency, updateCurrency } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** The home currency + the ones with daily rates. */
export function useCurrency() {
  const { token } = useAuth()
  return useQuery({
    queryKey: CURRENCY_KEY,
    queryFn: () => fetchCurrency(token!),
    enabled: !!token,
    staleTime: 5 * 60_000,
  })
}

/** Change the home currency: every amount is converted on read, so everything refetches. */
export function useUpdateCurrency() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (home: string) => updateCurrency(token!, home),
    onSuccess: (data) => queryClient.setQueryData(CURRENCY_KEY, data),
    onSettled: invalidate,
  })
}
