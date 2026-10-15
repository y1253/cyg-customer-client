import { useMutation } from '@tanstack/react-query'
import { forgotPassword } from '@/api/customerAuth'

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => forgotPassword(email),
  })
}
