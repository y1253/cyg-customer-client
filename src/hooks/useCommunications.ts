import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { COMMUNICATIONS_KEY, fetchChannelPage, fetchChannels, type CommChannel } from '@/api/communications'
import { useBook } from './useBook'

/** The Communication tab's channel list (step12), refreshed every 30s while open. */
export function useCommChannels(enabled = true) {
  const book = useBook()
  return useQuery({
    queryKey: book.key(COMMUNICATIONS_KEY),
    queryFn: () => fetchChannels(book.auth),
    enabled: !!book.token && enabled,
    refetchInterval: 30_000,
  })
}

/** One channel's chat, newest page first; older pages load as the customer scrolls up. */
export function useCommThread(channel: CommChannel | null) {
  const book = useBook()
  return useInfiniteQuery({
    queryKey: book.key([...COMMUNICATIONS_KEY, channel] as const),
    queryFn: ({ pageParam }) => fetchChannelPage(book.auth, channel!, pageParam || undefined),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    enabled: !!book.token && !!channel,
    refetchInterval: 30_000,
  })
}
