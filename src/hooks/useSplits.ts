import { useMutation } from '@tanstack/react-query'
import { renameTaxLine, saveSplits, type SplitInput } from '@/api/bookkeeping'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** Save a transaction's hand-made splits (the whole set). */
export function useSaveSplits() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: ({ id, splits }: { id: number; splits: SplitInput[] }) => saveSplits(book.auth, id, splits),
    onSettled: invalidate,
  })
}

/** Rename one tax line. */
export function useRenameTaxLine() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: ({ id, agencyId, name }: { id: number; agencyId: number; name: string | null }) =>
      renameTaxLine(book.auth, id, agencyId, name),
    onSettled: invalidate,
  })
}
