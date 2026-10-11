import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ACCOUNTS_KEY, createAccount, REPORTS_KEY, type AccountType } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'

/** A category of the customer's own; the category list and the chart of accounts refetch. */
export function useCreateAccount() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: { name: string; type: AccountType }) => createAccount(token!, values),
    onSettled: () =>
      Promise.all(
        [ACCOUNTS_KEY, REPORTS_KEY].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  })
}
