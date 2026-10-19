import { useMutation } from '@tanstack/react-query'
import { editTransaction, type EditScope } from '@/api/bookkeeping'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** Change one ledger row's name/category (only that row, or always for its payee). */
export function useEditTransaction() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: ({
      id,
      ...values
    }: {
      id: number
      name: string | null
      category: string | null
      scope: EditScope
    }) => editTransaction(book.auth, id, values),
    onSettled: invalidate,
  })
}
