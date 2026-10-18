import { useQuery } from '@tanstack/react-query'
import { fetchAuthConfig } from '@/api/customerAuth'

/** Public auth config: the Google client id and the Turnstile site key (null = off). */
export function useAuthConfig() {
  return useQuery({
    queryKey: ['customer-auth-config'],
    queryFn: fetchAuthConfig,
    staleTime: Infinity,
  })
}
