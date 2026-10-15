import { useMutation, useQueryClient } from '@tanstack/react-query'
import { changePassword, type ChangePasswordValues } from '@/api/customerAuth'
import { useAuth } from '@/context/AuthContext'

/** The server signs every other device out; the fresh token it returns keeps this one in. */
export function useChangePassword() {
  const { token, setSession } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ChangePasswordValues) => changePassword(token!, values),
    onSuccess: (result) => {
      setSession(result)
      queryClient.setQueryData(['customer-me'], result.customer)
    },
  })
}
