import { useMutation, useQueryClient } from '@tanstack/react-query'
import { NAMES_KEY, updateName } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** Switches tax on/off for one name — applied on read, so the ledger refetches at once. */
export function useUpdateName() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (values: { name: string; taxExempt: boolean }) => updateName(token!, values),
    onSuccess: (names) => queryClient.setQueryData(NAMES_KEY, names),
    onSettled: invalidate,
  })
}
