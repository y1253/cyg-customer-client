import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteNameGroup, NAMES_KEY, saveNameGroup, setNameGroup } from '@/api/bookkeeping'
import { useBook } from './useBook'

/** step9: put a name in a Names-tab group (a label: its accounts and tax stay). */
export function useSetNameGroup() {
  const book = useBook()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: { name: string; group: string | null }) => setNameGroup(book.auth, values),
    onSuccess: (data) => queryClient.setQueryData(book.key(NAMES_KEY), data),
    // step11 (2026-11-23): the Names tab's server pages too.
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...NAMES_KEY, 'page'] }),
  })
}

/** step9: create (no id) or rename one of the customer's own groups. */
export function useSaveNameGroup() {
  const book = useBook()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: { id?: number; name: string }) => saveNameGroup(book.auth, values),
    onSuccess: (data) => queryClient.setQueryData(book.key(NAMES_KEY), data),
    // step11 (2026-11-23): the Names tab's server pages too.
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...NAMES_KEY, 'page'] }),
  })
}

/** step9: remove a group — its names go back to following their category. */
export function useDeleteNameGroup() {
  const book = useBook()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteNameGroup(book.auth, id),
    onSuccess: (data) => queryClient.setQueryData(book.key(NAMES_KEY), data),
    // step11 (2026-11-23): the Names tab's server pages too.
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...NAMES_KEY, 'page'] }),
  })
}

