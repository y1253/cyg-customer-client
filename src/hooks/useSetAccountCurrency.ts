import { useMutation } from '@tanstack/react-query'
import { setAccountCurrency } from '@/api/bookkeeping'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/**
 * Set the currency of a statement account (`currency: null` = what each statement says).
 * Every amount is converted on read, so the ledger, reports and statements all refetch.
 */
export function useSetAccountCurrency() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (values: { account: string; currency: string | null }) => setAccountCurrency(book.auth, values),
    onSettled: invalidate,
  })
}
