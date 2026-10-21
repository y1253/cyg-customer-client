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

/**
 * The book's bank connections. While one is still bringing in its history it polls, so the
 * statements appear without a reload.
 */
export function useBankConnections(enabled: boolean) {
  const book = useBook()
  return useQuery({
    queryKey: book.key(BANK_FEEDS_KEY),
    queryFn: () => fetchBankConnections(book.auth),
    enabled: !!book.token && enabled,
    refetchInterval: (q) =>
      q.state.data?.some((c) => c.status === 'ACTIVE' && (!c.historyDone || !c.lastSyncAt)) ? 15_000 : false,
  })
}

/** Everything that follows a bank change: the connections and the whole book. */
function useAfterChange() {
  const queryClient = useQueryClient()
  const invalidateBook = useInvalidateBookkeeping()
  return () => Promise.all([queryClient.invalidateQueries({ queryKey: BANK_FEEDS_KEY }), invalidateBook()])
}

/**
 * Opens Plaid Link and keeps the bank. `itemId` = sign in to that bank again (update mode).
 * Resolves false when the customer closed the window.
 */
export function useConnectBank() {
  const book = useBook()
  const after = useAfterChange()
  return useMutation({
    mutationFn: async (itemId?: number): Promise<boolean> => {
      const token = await createLinkToken(book.auth, itemId)
      savePendingLink({ token, companyId: book.companyId, itemId, returnTo: window.location.pathname })
      const publicToken = await openPlaidLink(token).finally(clearPendingLink)
      if (!publicToken) return false
      if (itemId) await markReconnected(book.auth, itemId)
      else await exchangePublicToken(book.auth, publicToken)
      return true
    },
    onSuccess: (done) => {
      if (done) void after()
    },
  })
}

export function useRefreshBank() {
  const book = useBook()
  const after = useAfterChange()
  return useMutation({
    mutationFn: (id: number) => refreshBankConnection(book.auth, id),
    onSuccess: () => void after(),
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
