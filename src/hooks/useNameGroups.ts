import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteNameGroup, NAMES_KEY, saveNameGroup, setNameGroup, type NameGroup } from '@/api/bookkeeping'
import i18n from '@/i18n'
import { useBook } from './useBook'

const BUILTIN_GROUP_KEYS = ['CUSTOMER', 'SUPPLIER', 'OTHER'] as const
type BuiltinGroupKey = (typeof BUILTIN_GROUP_KEYS)[number]

/**
 * The server sends the built-in groups' English labels ("Suppliers") as data; a built-in group (no id) is shown
 * in the site's language. The customer's own groups keep the name they typed.
 */
export function localGroup(g: NameGroup): NameGroup {
  return !g.id && (BUILTIN_GROUP_KEYS as readonly string[]).includes(g.key)
    ? { ...g, label: i18n.t(`names:group.${g.key as BuiltinGroupKey}`) }
    : g
}

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

