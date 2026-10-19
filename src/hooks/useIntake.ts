import { useQuery } from '@tanstack/react-query'
import { fetchIntake } from '@/api/attachments'
import { INTAKE_KEY } from '@/api/bookkeeping'
import { useBook } from './useBook'

/** The numbers to text receipts to, and the phone this customer's texts are matched on. */
export function useIntake() {
  const book = useBook()
  return useQuery({
    queryKey: book.key(INTAKE_KEY),
    queryFn: () => fetchIntake(book.auth),
    enabled: !!book.token,
    staleTime: 60_000,
  })
}
