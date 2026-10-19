import { useMutation } from '@tanstack/react-query'
import { generate } from '@/api/bookkeeping'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** Generate: read every uploaded statement and apply changed tax settings. */
export function useGenerate() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: () => generate(book.auth),
    onSettled: invalidate,
  })
}
