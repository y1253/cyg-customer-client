import { useMutation } from '@tanstack/react-query'
import { deleteAgency } from '@/api/bookkeeping'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

export function useDeleteAgency() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (id: number) => deleteAgency(book.auth, id),
    onSettled: invalidate,
  })
}
