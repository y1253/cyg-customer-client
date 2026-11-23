import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { NAME_FOLDERS_KEY } from '@/api/attachments'
import {
  applySplitRule,
  deleteSplit,
  deleteSubName,
  duplicateSplit,
  editSplit,
  fetchSubNames,
  NAMES_KEY,
  saveSplits,
  setProduct,
  setSubNameCategory,
  setSubNameParent,
  setSubNameSettings,
  type SplitEdit,
  type SubNameSettings,
  type SplitInput,
} from '@/api/bookkeeping'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** step2 (2026-11-15): under the names key, so every names refetch takes it along. */
export const SUB_NAMES_KEY = [...NAMES_KEY, 'sub'] as const

/** Save a transaction's hand-made splits (the whole set). */
export function useSaveSplits() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: ({ id, splits }: { id: number; splits: SplitInput[] }) => saveSplits(book.auth, id, splits),
    onSettled: invalidate,
  })
}

/** step2 (2026-11-15): Split = one more split at $0.00, a copy of the row clicked. */
export function useDuplicateSplit() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (id: number) => duplicateSplit(book.auth, id),
    onSettled: invalidate,
  })
}

/** step12 (2026-11-22): a one-time split by a split group / rule — this row, or every row of its name now. */
export function useApplySplitRule() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: ({ id, ...body }: Parameters<typeof applySplitRule>[2] & { id: number }) =>
      applySplitRule(book.auth, id, body),
    onSettled: invalidate,
  })
}

/** step2 (2026-11-15): one split edited in place. */
export function useEditSplit() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: ({ id, values }: { id: number; values: SplitEdit }) => editSplit(book.auth, id, values),
    onSettled: invalidate,
  })
}

/** step2 (2026-11-15): remove one split. */
export function useDeleteSplit() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (id: number) => deleteSplit(book.auth, id),
    onSettled: invalidate,
  })
}

/** step2 (2026-11-15): a transaction's Product column. */
export function useSetProduct() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: ({ id, itemName }: { id: number; itemName: string }) => setProduct(book.auth, id, itemName),
    onSettled: invalidate,
  })
}

/** step2 (2026-11-15): the book's sub-names, for the Names tab. */
export function useSubNames() {
  const book = useBook()
  return useQuery({
    queryKey: book.key(SUB_NAMES_KEY),
    queryFn: () => fetchSubNames(book.auth),
  })
}

export function useSetSubNameCategory() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: ({ id, category }: { id: number; category: string }) => setSubNameCategory(book.auth, id, category),
    onSettled: invalidate,
  })
}

/** step9 part 3: a sub-name's own name, group, profile and split rules. */
export function useSetSubNameSettings() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: SubNameSettings & { id: number }) => setSubNameSettings(book.auth, id, body),
    // A rename moves the sub-name's folders too.
    onSettled: () => Promise.all([invalidate(), queryClient.invalidateQueries({ queryKey: NAME_FOLDERS_KEY })]),
  })
}

/** step9 (2026-11-23): a sub-name moves under another name (it may be renamed, so folders refetch). */
export function useSetSubNameParent() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => setSubNameParent(book.auth, id, name),
    onSettled: () => Promise.all([invalidate(), queryClient.invalidateQueries({ queryKey: NAME_FOLDERS_KEY })]),
  })
}

export function useDeleteSubName() {
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (id: number) => deleteSubName(book.auth, id),
    onSettled: invalidate,
  })
}
