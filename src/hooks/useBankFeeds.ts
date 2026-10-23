import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BANK_FEEDS_CONFIG_KEY,
  BANK_FEEDS_KEY,
  createLinkToken,
  exchangePublicToken,
  fetchBankConnections,
  fetchBankFeedsConfig,
  markReconnected,
  refreshBankConnection,
  removeBankConnection,
  saveStartDates,
  type BankConnection,
  type StartDate,
} from '@/api/bankFeeds'
import { clearPendingLink, openPlaidLink, savePendingLink } from '@/lib/plaid-link'
import { useBook } from './useBook'
import { useInvalidateBookkeeping } from './useInvalidateBookkeeping'

/** Whether the server offers bank connections at all. */
export function useBankFeedsEnabled(): boolean {
  const book = useBook()
  const q = useQuery({
    queryKey: BANK_FEEDS_CONFIG_KEY,
    queryFn: () => fetchBankFeedsConfig(book.auth),
    enabled: !!book.token,
    staleTime: 5 * 60_000,
  })
  return q.data?.enabled ?? false
}

/** Still bringing in its history, or syncing right now. */
function busy(c: BankConnection): boolean {
  // Waiting on the bank (`error` set) is not busy: the server keeps trying every 5 minutes.
  return c.status === 'ACTIVE' && (c.syncing || ((!c.historyDone || !c.lastSyncAt) && !c.error))
}

/**
 * The book's bank connections. While one is busy it polls, and every finished sync
 * refetches the whole book, so the statements appear without a reload.
 */
export function useBankConnections(enabled: boolean) {
  const book = useBook()
  const invalidateBook = useInvalidateBookkeeping()
  const q = useQuery({
    queryKey: book.key(BANK_FEEDS_KEY),
    queryFn: () => fetchBankConnections(book.auth),
    enabled: !!book.token && enabled,
    refetchInterval: (q) => (q.state.data?.some(busy) ? 15_000 : false),
  })

  const synced = useRef<Map<number, string | null> | null>(null)
  useEffect(() => {
    if (!q.data) return
    const now = new Map(q.data.map((c) => [c.id, c.lastSyncAt]))
    const before = synced.current
    synced.current = now
    if (before && [...now].some(([id, at]) => before.has(id) && before.get(id) !== at)) void invalidateBook()
  }, [q.data, invalidateBook])

  return q
}

/** Everything that follows a bank change: the connections and the whole book. */
function useAfterChange() {
  const queryClient = useQueryClient()
  const invalidateBook = useInvalidateBookkeeping()
  return () => Promise.all([queryClient.invalidateQueries({ queryKey: BANK_FEEDS_KEY }), invalidateBook()])
}

/**
 * Opens Plaid Link and keeps the bank; the customer picks its accounts there (Account
 * Select). `itemId` = update mode on that bank: sign in again, or with `chooseAccounts`
 * pick its accounts again. Resolves with the connection, null when Link was closed.
 */
export function useConnectBank() {
  const book = useBook()
  const after = useAfterChange()
  return useMutation({
    mutationFn: async ({
      itemId,
      chooseAccounts = false,
    }: { itemId?: number; chooseAccounts?: boolean } = {}): Promise<BankConnection | null> => {
      const token = await createLinkToken(book.auth, itemId, chooseAccounts)
      savePendingLink({
        token,
        companyId: book.companyId,
        bookId: book.bookId,
        itemId,
        returnTo: window.location.pathname + window.location.search,
      })
      const publicToken = await openPlaidLink(token).finally(clearPendingLink)
      if (!publicToken) return null
      return itemId ? markReconnected(book.auth, itemId) : exchangePublicToken(book.auth, publicToken)
    },
    onSuccess: (connection) => {
      if (connection) void after()
    },
  })
}

/** Each account's first day in the books; confirms a new connection. */
export function useSaveStartDates() {
  const book = useBook()
  const after = useAfterChange()
  return useMutation({
    mutationFn: ({ id, accounts }: { id: number; accounts: StartDate[] }) => saveStartDates(book.auth, id, accounts),
    onSuccess: () => void after(),
  })
}

export function useRefreshBank() {
  const book = useBook()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => refreshBankConnection(book.auth, id),
    // Answers at once; the list polls while `syncing` and refetches the book when done.
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: BANK_FEEDS_KEY }),
  })
}

export function useDisconnectBank() {
  const book = useBook()
  const after = useAfterChange()
  return useMutation({
    mutationFn: (id: number) => removeBankConnection(book.auth, id),
    onSuccess: () => void after(),
  })
}
