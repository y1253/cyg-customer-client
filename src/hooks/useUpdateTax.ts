import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TAX_KEY, updateTax } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** The sales-tax switch. Tax rows appear or disappear at once (they are already stored). */
export function useUpdateTax() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (enabled: boolean) => updateTax(token!, enabled),
    onSuccess: (settings) => queryClient.setQueryData(TAX_KEY, settings),
    onSettled: invalidate,
  })
}
