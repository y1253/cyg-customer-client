import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  NAMES_KEY,
  resetNameRule,
  saveNameRule,
  type EditScope,
  type NameRuleRef,
} from '@/api/bookkeeping'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/**
 * Save the customer's own name/category. It rewrites their existing rows on the server, so
 * the ledger, reports and names all refetch.
 */
export function useSaveNameRule() {
  const book = useBook()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (
      values: NameRuleRef & { name: string | null; category: string | null; scope: EditScope },
    ) => saveNameRule(book.auth, values),
    onSuccess: (data) => queryClient.setQueryData(book.key(NAMES_KEY), data),
    onSettled: invalidate,
  })
}

/** Back to the default: removes the customer's own change. */
export function useResetNameRule() {
  const book = useBook()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (values: NameRuleRef) => resetNameRule(book.auth, values),
    onSuccess: (data) => queryClient.setQueryData(book.key(NAMES_KEY), data),
    onSettled: invalidate,
  })
}
