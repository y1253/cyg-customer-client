import { useMutation } from '@tanstack/react-query'
import { saveAgency, type TaxAgencyInput } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** Creates (no id) or updates an agency — including the Active switch. */
export function useSaveAgency() {
  const { token } = useAuth()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (values: Partial<TaxAgencyInput> & { id?: number }) => saveAgency(token!, values),
    onSettled: invalidate,
  })
}
