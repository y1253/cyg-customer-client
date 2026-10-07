import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteStatement, STATEMENTS_KEY, TRANSACTIONS_KEY } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'

export function useDeleteStatement() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteStatement(token!, id),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
    },
  })
}
