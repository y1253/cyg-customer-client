import { useQuery } from '@tanstack/react-query'
import { fetchAuthConfig } from '@/api/customerAuth'

/** The Google client id for the Sign in with Google button (null = not configured). */
export function useAuthConfig() {
  return useQuery({
    queryKey: ['customer-auth-config'],
    queryFn: fetchAuthConfig,
    staleTime: Infinity,
  })
}
