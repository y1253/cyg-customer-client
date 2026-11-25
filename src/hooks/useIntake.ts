import { useQuery } from '@tanstack/react-query'
import { fetchIntake } from '@/api/attachments'
import { INTAKE_KEY } from '@/api/bookkeeping'
import { useBook } from './useBook'

/** The numbers to text receipts to, and the phone this customer's texts are matched on. */
// `enabled` false while the account is locked (2026-11-25): the route answers 402 then.
export function useIntake(enabled = true) {
  const book = useBook()
  return useQuery({
    queryKey: book.key(INTAKE_KEY),
    queryFn: () => fetchIntake(book.auth),
    enabled: !!book.token && enabled,
    staleTime: 60_000,
  })
}
