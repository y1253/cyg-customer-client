import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import {
  ACCOUNTS_KEY,
  mergeAccounts,
  mergeNames,
  NAMES_KEY,
  renameAccount,
  type MergeEnd,
  type NamesData,
  type NamesPage,
  type SubName,
} from '@/api/bookkeeping'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'
import { SUB_NAMES_KEY } from './useSplits'

/**
 * step8: merge one payee name into another — every row moves, so the whole page refetches.
 * step9 (2026-11-18, part 2): a dragged sub-name leaves the list at once (its descriptions
 * move onto the sub-name it was dropped on) — put back if the merge fails.
 */
export function useMergeNames() {
  const book = useBook()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateBookkeeping()
  const subsKey = book.key(SUB_NAMES_KEY)
  const namesKey = book.key(NAMES_KEY)
  return useMutation({
    mutationFn: (ends: { from: MergeEnd; into: MergeEnd }) => mergeNames(book.auth, ends),
    onMutate: async ({ from, into }) => {
      const fromId = from.subId
      if (!fromId) return undefined
      await Promise.all([
        queryClient.cancelQueries({ queryKey: subsKey, exact: true }),
        queryClient.cancelQueries({ queryKey: namesKey, exact: true }),
      ])
      // step11 (2026-11-23): the Names tab's server pages — the dragged sub-name leaves them too.
      const pagesKey = [...NAMES_KEY, 'page']
      await queryClient.cancelQueries({ queryKey: pagesKey })
      const pages = queryClient.getQueriesData<InfiniteData<NamesPage>>({ queryKey: pagesKey })
      queryClient.setQueriesData<InfiniteData<NamesPage>>({ queryKey: pagesKey }, (old) =>
        old && {
          ...old,
          pages: old.pages.map((p) => ({ ...p, subNames: p.subNames.filter((s) => s.id !== fromId) })),
        },
      )
      const subs = queryClient.getQueryData<SubName[]>(subsKey)
      const names = queryClient.getQueryData<NamesData>(namesKey)
      if (subs) queryClient.setQueryData<SubName[]>(subsKey, subs.filter((s) => s.id !== fromId))
      if (names?.subDescriptions?.[fromId] || names?.subContains?.[fromId]) {
        const move = <T,>(all: Record<number, T[]> | undefined) => {
          if (!all?.[fromId]) return all
          const { [fromId]: moved, ...rest } = all
          if (into.subId) rest[into.subId] = [...(rest[into.subId] ?? []), ...moved]
          return rest
        }
        queryClient.setQueryData<NamesData>(namesKey, {
          ...names,
          subDescriptions: move(names.subDescriptions),
          subContains: move(names.subContains),
        })
      }
      return { subs, names, pages }
    },
    onError: (_error, _ends, before) => {
      if (before?.subs) queryClient.setQueryData(subsKey, before.subs)
      if (before?.names) queryClient.setQueryData(namesKey, before.names)
      for (const [key, data] of before?.pages ?? []) queryClient.setQueryData(key, data)
    },
    onSuccess: (data) => queryClient.setQueryData(namesKey, data),
    onSettled: invalidate,
  })
}

/** step8: merge one account into another (rows, rules, folders) — everything refetches. */
export function useMergeAccounts() {
  const queryClient = useQueryClient()
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (values: { from: string; into: string; name?: string }) => mergeAccounts(book.auth, values),
    onSettled: () => Promise.all([invalidate(), queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })]),
  })
}

/** step2: rename an account (reports, Bank feeds folder) — every place naming it refetches. */
export function useRenameAccount() {
  const queryClient = useQueryClient()
  const book = useBook()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (values: { from: string; to: string }) => renameAccount(book.auth, values),
    onSuccess: () => Promise.all([invalidate(), queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })]),
  })
}
