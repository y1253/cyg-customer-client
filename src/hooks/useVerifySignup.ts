import { useMutation } from '@tanstack/react-query'
import { verifySignup, type VerifySignupValues } from '@/api/customerAuth'
import { useAuth } from '@/context/AuthContext'

export function useVerifySignup() {
  const { setSession } = useAuth()
  return useMutation({
    mutationFn: (values: VerifySignupValues) => verifySignup(values),
    onSuccess: setSession,
  })
}
