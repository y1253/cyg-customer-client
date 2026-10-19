import { useMutation } from '@tanstack/react-query'
import { saveAgency, type TaxAgencyInput } from '@/api/bookkeeping'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** Creates (no id) or updates an agency — including the Active switch. */
export function useSaveAgency() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (values: Partial<TaxAgencyInput> & { id?: number }) => saveAgency(book.auth, values),
    onSettled: invalidate,
  })
}
