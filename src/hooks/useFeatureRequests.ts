import { useQuery } from '@tanstack/react-query'
import { fetchFeatureRequests } from '@/api/featureRequests'
import { useAuth } from '@/context/AuthContext'

/** step12e: what the customer asked the AI for that we don't do yet ("My requests"). */
export function useFeatureRequests() {
  const { token } = useAuth()
  return useQuery({
    queryKey: ['feature-requests'],
    queryFn: () => fetchFeatureRequests(token!),
    enabled: !!token,
  })
}
