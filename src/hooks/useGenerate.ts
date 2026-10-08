import { useMutation } from '@tanstack/react-query'
import { generate } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** Generate: read every uploaded statement and apply changed tax settings. */
export function useGenerate() {
  const { token } = useAuth()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: () => generate(token!),
    onSettled: invalidate,
  })
}
