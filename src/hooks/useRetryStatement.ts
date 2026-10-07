import { useMutation, useQueryClient } from '@tanstack/react-query'
import { retryStatement, STATEMENTS_KEY } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'

export function useRetryStatement() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => retryStatement(token!, id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY }),
  })
}
