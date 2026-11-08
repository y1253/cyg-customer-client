import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ACCOUNTS_KEY, mergeAccounts, mergeNames, NAMES_KEY, renameAccount } from '@/api/bookkeeping'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** step8: merge one payee name into another — every row moves, so the whole page refetches. */
export function useMergeNames() {
  const book = useBook()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateBookkeeping()
  return useMutation({
    mutationFn: (values: { from: string; into: string }) => mergeNames(book.auth, values),
    onSuccess: (data) => queryClient.setQueryData(book.key(NAMES_KEY), data),
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
