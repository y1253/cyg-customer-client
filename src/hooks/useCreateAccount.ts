import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ACCOUNTS_KEY, createAccount, REPORTS_KEY, type AccountType } from '@/api/bookkeeping'
import { useBook } from './useBook'

/** A category of the customer's own; the category list and the chart of accounts refetch. */
export function useCreateAccount() {
  const book = useBook()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: { name: string; type: AccountType }) => createAccount(book.auth, values),
    onSettled: () =>
      Promise.all(
        [ACCOUNTS_KEY, REPORTS_KEY].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  })
}
