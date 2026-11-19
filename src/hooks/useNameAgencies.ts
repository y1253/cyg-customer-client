import { useMutation, useQueryClient } from '@tanstack/react-query'
import { NAMES_KEY, setNameAgencies } from '@/api/bookkeeping'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** The split rules of one name — a rule added splits its rows at once, so the ledger and reports refetch. */
export function useNameAgencies() {
  const book = useBook()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (values: { name: string; agencyIds: number[]; alone?: boolean }) =>
      setNameAgencies(book.auth, values),
    onSuccess: (names) => queryClient.setQueryData(book.key(NAMES_KEY), names),
    onSettled: invalidate,
  })
}
