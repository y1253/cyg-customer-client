import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  fetchTransactionPage,
  fetchTransactionSummary,
  TRANSACTIONS_KEY,
  type LedgerQuery,
} from '@/api/bookkeeping'
import { useBook } from './useBook'

/** Families per page — a transaction always comes with its splits. */
const PAGE = 100

/**
 * step11 (2026-11-23, user's request): the ledger page by page from the server, filtered,
 * searched and sorted there; the next page loads as the end of the table comes into view.
 * Under `TRANSACTIONS_KEY`, so every change that refetched the ledger still does.
 */
export function useLedgerPages(query: LedgerQuery, { enabled = true }: { enabled?: boolean } = {}) {
  const book = useBook()
  return useInfiniteQuery({
    queryKey: book.key([...TRANSACTIONS_KEY, 'page', query] as const),
    queryFn: ({ pageParam }) => fetchTransactionPage(book.auth, query, pageParam, PAGE),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled: !!book.token && enabled,
    // A new search keeps the old rows on screen until the new ones arrive.
    placeholderData: keepPreviousData,
  })
}

/** step11 (2026-11-23): the totals of the same query — counts, net change, per category. */
export function useLedgerSummary(query: LedgerQuery, { enabled = true }: { enabled?: boolean } = {}) {
  const book = useBook()
  return useQuery({
    queryKey: book.key([...TRANSACTIONS_KEY, 'summary', query] as const),
    queryFn: () => fetchTransactionSummary(book.auth, query),
    enabled: !!book.token && enabled,
    placeholderData: keepPreviousData,
  })
}
