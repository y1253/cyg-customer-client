import { useMutation, useQueryClient } from '@tanstack/react-query'
import { NAMES_KEY, resetNameRule, saveNameRule, type NameRuleRef } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/**
 * Save the customer's own name/category. It rewrites their existing rows on the server, so
 * the ledger, reports and names all refetch.
 */
export function useSaveNameRule() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (values: NameRuleRef & { name: string | null; category: string | null }) =>
      saveNameRule(token!, values),
    onSuccess: (data) => queryClient.setQueryData(NAMES_KEY, data),
    onSettled: invalidate,
  })
}

/** Back to the default: removes the customer's own change. */
export function useResetNameRule() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (values: NameRuleRef) => resetNameRule(token!, values),
    onSuccess: (data) => queryClient.setQueryData(NAMES_KEY, data),
    onSettled: invalidate,
  })
}
