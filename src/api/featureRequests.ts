import { errorFrom, fetchWithAuth } from './client'

export type FeatureStatus = 'OPEN' | 'PLANNED' | 'DONE' | 'DECLINED'

/** step12e: something the customer asked the AI for that we don't do yet. */
export type FeatureRequest = {
  id: number
  summary: string
  /** What they asked, in their own words. */
  request: string
  status: FeatureStatus
  /** The team's note to them. */
  staffNote: string | null
  channel: string
  /** The book they asked from. */
  book: string | null
  createdAt: string
  updatedAt: string
  doneAt: string | null
}

export async function fetchFeatureRequests(token: string): Promise<FeatureRequest[]> {
  const res = await fetchWithAuth(token, '/api/feature-requests')
  if (!res.ok) throw await errorFrom(res)
  return res.json() as Promise<FeatureRequest[]>
}
