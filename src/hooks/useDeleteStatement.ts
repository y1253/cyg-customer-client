import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteStatement, STATEMENTS_KEY, TRANSACTIONS_KEY } from '@/api/bookkeeping'
import { useBook } from './useBook'

export function useDeleteStatement() {
  const book = useBook()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteStatement(book.auth, id),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
    },
  })
}
