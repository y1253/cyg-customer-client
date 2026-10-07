import { useMutation } from '@tanstack/react-query'
import { login, type LoginValues } from '@/api/customerAuth'
import { useAuth } from '@/context/AuthContext'

export function useLogin() {
  const { setSession } = useAuth()
  return useMutation({
    mutationFn: (values: LoginValues) => login(values),
    onSuccess: setSession,
  })
}
