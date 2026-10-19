import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CURRENCY_KEY, fetchCurrency, updateCurrency } from '@/api/bookkeeping'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** The home currency + the ones with daily rates. */
export function useCurrency() {
  const book = useBook()
  return useQuery({
    queryKey: book.key(CURRENCY_KEY),
    queryFn: () => fetchCurrency(book.auth),
    enabled: !!book.token,
    staleTime: 5 * 60_000,
  })
}

/** Change the home currency: every amount is converted on read, so everything refetches. */
export function useUpdateCurrency() {
  const book = useBook()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (home: string) => updateCurrency(book.auth, home),
    onSuccess: (data) => queryClient.setQueryData(book.key(CURRENCY_KEY), data),
    onSettled: invalidate,
  })
}
