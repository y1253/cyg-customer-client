import { useMutation } from '@tanstack/react-query'
import { sendPasswordCode } from '@/api/customerAuth'
import { useAuth } from '@/context/AuthContext'

export function useSendPasswordCode() {
  const { token } = useAuth()
  return useMutation({
    mutationFn: () => sendPasswordCode(token!),
  })
}
