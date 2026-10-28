import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CHANGES_KEY, fetchChanges } from '@/api/assistant'
import { useAuth } from '@/context/AuthContext'
import { useRefreshEverything } from './useRefreshEverything'

/** How often an open, visible page asks whether something changed. */
const POLL_MS = 10_000

/**
 * step12h: the open dashboard follows changes made ELSEWHERE — the AI answering a text, a
 * WhatsApp, an email or a phone call, the strong AI after a call, a statement or receipt
 * finishing its reading, a bank-feed sync. Polls a tiny counter while the tab is visible
 * (TanStack pauses the interval in a background tab) and refetches what is on screen when
 * it moves. The first answer only sets the baseline.
 */
export function useLiveRefresh() {
  const { token } = useAuth()
  const refresh = useRefreshEverything()
  const seen = useRef<string | null>(null)
  const { data } = useQuery({
    queryKey: CHANGES_KEY,
    queryFn: () => fetchChanges(token!),
    enabled: !!token,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  })
  const version = data?.version ?? null
  useEffect(() => {
    if (!version) return
    if (seen.current !== null && seen.current !== version) void refresh()
    seen.current = version
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])
}
