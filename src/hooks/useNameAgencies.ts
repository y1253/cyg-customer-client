import { useMutation, useQueryClient } from '@tanstack/react-query'
import { NAMES_KEY, setNameAgencies } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** Which agencies tax one name — applied on read, so the ledger and reports refetch at once. */
export function useNameAgencies() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (values: { name: string; agencyIds: number[] }) => setNameAgencies(token!, values),
    onSuccess: (names) => queryClient.setQueryData(NAMES_KEY, names),
    onSettled: invalidate,
  })
}
