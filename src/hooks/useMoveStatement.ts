import { useMutation, useQueryClient } from '@tanstack/react-query'
import { moveStatement, STATEMENTS_KEY, type Statement } from '@/api/bookkeeping'
import { useBook } from './useBook'

/**
 * File a statement under another account. Its rows, the reports, the starting-balance
 * chains and the account list all change, so everything bookkeeping refetches. step2
 * (2026-11-11): the row jumps to its new folder at once (put back if the move fails); the
 * refetch then brings both folders' starting dates and problems as the server sees them.
 */
export function useMoveStatement() {
  const book = useBook()
  const queryClient = useQueryClient()
  const key = book.key(STATEMENTS_KEY)
  return useMutation({
    mutationFn: (v: { id: number; accountName: string }) => moveStatement(book.auth, v.id, v.accountName),
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: key })
      const before = queryClient.getQueryData<Statement[]>(key)
      queryClient.setQueryData<Statement[]>(key, (list) =>
        list?.map((s) => (s.id === v.id ? { ...s, accountName: v.accountName, movedByCustomer: true } : s)),
      )
      return { before }
    },
    onError: (_err, _v, context) => {
      if (context?.before) queryClient.setQueryData(key, context.before)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['bookkeeping'] }),
  })
}
