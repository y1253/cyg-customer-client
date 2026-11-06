import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFeatureRequest, fetchFeatureRequests } from '@/api/featureRequests'
import { useAuth } from '@/context/AuthContext'

const KEY = ['feature-requests'] as const

/** step12e: what the customer asked the AI for that we don't do yet ("My requests"). */
export function useFeatureRequests() {
  const { token } = useAuth()
  return useQuery({
    queryKey: KEY,
    queryFn: () => fetchFeatureRequests(token!),
    enabled: !!token,
  })
}

/** A request typed on the My requests page. */
export function useCreateFeatureRequest() {
  const { token } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { summary: string; request?: string }) => createFeatureRequest(token!, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
