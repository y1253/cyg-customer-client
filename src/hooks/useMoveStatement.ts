import { useMutation, useQueryClient } from '@tanstack/react-query'
import { moveStatement } from '@/api/bookkeeping'
import { useBook } from './useBook'

/**
 * File a statement under another account. Its rows, the reports, the starting-balance
 * chains and the account list all change, so everything bookkeeping refetches.
 */
export function useMoveStatement() {
  const book = useBook()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: number; accountName: string }) => moveStatement(book.auth, v.id, v.accountName),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['bookkeeping'] }),
  })
}
