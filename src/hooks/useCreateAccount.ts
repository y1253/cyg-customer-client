import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ACCOUNTS_KEY, createAccount, type AccountType } from '@/api/bookkeeping'
import { useAuth } from '@/context/AuthContext'

/** A category of the customer's own; the list of categories refetches. */
export function useCreateAccount() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: { name: string; type: AccountType }) => createAccount(token!, values),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
  })
}
