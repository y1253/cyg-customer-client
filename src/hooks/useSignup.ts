import { useMutation } from '@tanstack/react-query'
import { signup, type SignupValues } from '@/api/customerAuth'
import { useAuth } from '@/context/AuthContext'

export function useSignup() {
  const { setSession } = useAuth()
  return useMutation({
    mutationFn: (values: SignupValues) => signup(values),
    onSuccess: setSession,
  })
}
