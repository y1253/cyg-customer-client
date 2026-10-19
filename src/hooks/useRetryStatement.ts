import { useMutation, useQueryClient } from '@tanstack/react-query'
import { retryStatement, STATEMENTS_KEY } from '@/api/bookkeeping'
import { useBook } from './useBook'

export function useRetryStatement() {
  const book = useBook()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => retryStatement(book.auth, id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY }),
  })
}
