import { useMutation } from '@tanstack/react-query'
import { resendSignupCode } from '@/api/customerAuth'

export function useResendSignupCode() {
  return useMutation({
    mutationFn: (email: string) => resendSignupCode(email),
  })
}
