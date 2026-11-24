import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { fetchNamesPage, fetchUnrecognized, NAMES_KEY } from '@/api/bookkeeping'
import { useBook } from './useBook'

/** Names per page. */
const PAGE = 40

/**
 * step11 (2026-11-23, user's request): the Names tab page by page from the server, filtered and
 * searched there; the next page loads as the end of the list comes into view. Under
 * `NAMES_KEY`, so every change that refetched the names still does.
 */
export function useNamesPages(query: { filter: string; q: string }) {
  const book = useBook()
  return useInfiniteQuery({
    queryKey: book.key([...NAMES_KEY, 'page', query] as const),
    queryFn: ({ pageParam }) => fetchNamesPage(book.auth, query, pageParam, PAGE),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled: !!book.token,
    // A new search or chip keeps the old rows on screen until the new ones arrive.
    placeholderData: keepPreviousData,
  })
}

/** step11 (2026-11-23): the nameless descriptions, only while the tab shows them. */
export function useUnrecognized(q: string, { enabled = true }: { enabled?: boolean } = {}) {
  const book = useBook()
  return useQuery({
    queryKey: book.key([...NAMES_KEY, 'unrecognized', q] as const),
    queryFn: () => fetchUnrecognized(book.auth, q),
    enabled: !!book.token && enabled,
    placeholderData: keepPreviousData,
  })
}
