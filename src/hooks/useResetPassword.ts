import { useMutation } from '@tanstack/react-query'
import { resetPassword, type ResetPasswordValues } from '@/api/customerAuth'
import { useAuth } from '@/context/AuthContext'

export function useResetPassword() {
  const { setSession } = useAuth()
  return useMutation({
    mutationFn: (values: ResetPasswordValues) => resetPassword(values),
    onSuccess: setSession,
  })
}
