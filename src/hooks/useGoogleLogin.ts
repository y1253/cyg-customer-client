import { useMutation } from '@tanstack/react-query'
import { googleLogin } from '@/api/customerAuth'
import { useAuth } from '@/context/AuthContext'

export function useGoogleLogin() {
  const { setSession } = useAuth()
  return useMutation({
    mutationFn: (credential: string) => googleLogin(credential),
    onSuccess: setSession,
  })
}
