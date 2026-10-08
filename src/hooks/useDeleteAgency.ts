import { useMutation } from '@tanstack/react-query'
import { deleteAgency } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

export function useDeleteAgency() {
  const { token } = useAuth()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (id: number) => deleteAgency(token!, id),
    onSettled: invalidate,
  })
}
