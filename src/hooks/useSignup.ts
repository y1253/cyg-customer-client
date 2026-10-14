import { useMutation } from '@tanstack/react-query'
import { signup, type SignupValues } from '@/api/customerAuth'

/** Step 1 of signup — emails the code. No session yet: see `useVerifySignup`. */
export function useSignup() {
  return useMutation({
    mutationFn: (values: SignupValues) => signup(values),
  })
}
