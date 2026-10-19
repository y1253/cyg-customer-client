import { useMutation, useQueryClient } from '@tanstack/react-query'
import { NAMES_KEY, setNameAgencies } from '@/api/bookkeeping'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** Which agencies tax one name — applied on read, so the ledger and reports refetch at once. */
export function useNameAgencies() {
  const book = useBook()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (values: { name: string; agencyIds: number[] }) => setNameAgencies(book.auth, values),
    onSuccess: (names) => queryClient.setQueryData(book.key(NAMES_KEY), names),
    onSettled: invalidate,
  })
}
