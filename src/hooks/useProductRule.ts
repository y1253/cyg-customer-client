import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PRODUCTS_KEY, resetProductRule, saveProductRule } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/**
 * Save the customer's own category for an item. It moves their existing rows on the server,
 * so the ledger, reports and products all refetch.
 */
export function useSaveProductRule() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (values: { itemKey: string; category: string }) => saveProductRule(token!, values),
    onSuccess: (data) => queryClient.setQueryData(PRODUCTS_KEY, data),
    onSettled: invalidate,
  })
}

/** Back to the default: removes the customer's own category for an item. */
export function useResetProductRule() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (values: { itemKey: string }) => resetProductRule(token!, values),
    onSuccess: (data) => queryClient.setQueryData(PRODUCTS_KEY, data),
    onSettled: invalidate,
  })
}
