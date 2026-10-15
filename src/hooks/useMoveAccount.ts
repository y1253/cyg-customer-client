import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ACCOUNTS_KEY, NAMES_KEY, REPORTS_KEY, setAccountType, type AccountType } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'

/**
 * Move an account to another section ("drag it to Liabilities"); `type: null` resets it.
 * The reports, the category list and the Names tab (its types follow the account) refetch.
 */
export function useMoveAccount() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: { account: string; type: AccountType | null }) => setAccountType(token!, values),
    onSettled: () =>
      Promise.all(
        [REPORTS_KEY, ACCOUNTS_KEY, NAMES_KEY].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  })
}
