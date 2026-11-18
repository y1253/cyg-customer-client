import { useMutation } from '@tanstack/react-query'
import { deleteSplitGroup, saveSplitGroup } from '@/api/bookkeeping'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** step9 (2026-11-17): creates (no id) or renames a split group; step9 (2026-11-18) or switches it on / off. */
export function useSaveSplitGroup() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (values: { id?: number; name?: string; active?: boolean }) => saveSplitGroup(book.auth, values),
    onSettled: invalidate,
  })
}

/** Removes a split group — its rules become individual. */
export function useDeleteSplitGroup() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (id: number) => deleteSplitGroup(book.auth, id),
    onSettled: invalidate,
  })
}
