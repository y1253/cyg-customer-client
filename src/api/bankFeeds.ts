import { bookFetch, type BookAuth } from './bookkeeping'
import { errorFrom } from './client'

export const BANK_FEEDS_KEY = ['bank-feeds'] as const
export const BANK_FEEDS_CONFIG_KEY = ['bank-feeds', 'config'] as const

export type BankConnectionStatus = 'ACTIVE' | 'LOGIN_REQUIRED' | 'ERROR' | 'REMOVED'

/** A bank connected through Plaid (step11) — its months become statements by themselves. */
export type BankConnection = {
  id: number
  institutionName: string | null
  status: BankConnectionStatus
  error: string | null
  /** Every past transaction (up to 2 years) has arrived. */
  historyDone: boolean
  lastSyncAt: string | null
  createdAt: string
  /** When the start dates were confirmed; null = nothing is filed until they are. */
  setupAt: string | null
  /** A sync is running right now. */
  syncing: boolean
  /** Only on a "Refresh now" answer: why the bank was not asked again right now. */
  refreshNote?: string | null
  /** The bank has an account the customer has not shared yet. */
  newAccounts: boolean
  /** YYYY-MM-DD — the oldest day Plaid can give. */
  earliestDate: string
  /** The accounts the customer shared in Plaid Link. */
  accounts: Array<{
    id: number
    name: string
    mask: string | null
    kind: string
    /** The folder its months are filed under. */
    accountName: string
    currency: string | null
    currentBalance: number | null
    /** YYYY-MM-DD — the first day filed; null = all the history there is. */
    startDate: string | null
  }>
}

export type StartDate = { id: number; startDate: string | null }

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
})

async function ok<T>(res: Response): Promise<T> {
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function fetchBankFeedsConfig(auth: BookAuth): Promise<{ enabled: boolean }> {
  return ok(await bookFetch(auth, '/api/bank-feeds/config'))
}

export async function fetchBankConnections(auth: BookAuth): Promise<BankConnection[]> {
  return ok(await bookFetch(auth, '/api/bank-feeds'))
}

/**
 * A Plaid Link token; with `itemId`, for signing in to that bank again — and with
 * `chooseAccounts`, for picking again which of its accounts are shared.
 */
export async function createLinkToken(auth: BookAuth, itemId?: number, chooseAccounts = false): Promise<string> {
  const url = itemId
    ? `/api/bank-feeds/link-token?itemId=${itemId}${chooseAccounts ? '&accounts=1' : ''}`
    : '/api/bank-feeds/link-token'
  const res = await ok<{ linkToken: string }>(await bookFetch(auth, url, json('POST')))
  return res.linkToken
}

export async function exchangePublicToken(auth: BookAuth, publicToken: string): Promise<BankConnection> {
  return ok(await bookFetch(auth, '/api/bank-feeds/exchange', json('POST', { publicToken })))
}

export async function markReconnected(auth: BookAuth, id: number): Promise<BankConnection> {
  return ok(await bookFetch(auth, `/api/bank-feeds/${id}/reconnected`, json('POST')))
}

export async function saveStartDates(auth: BookAuth, id: number, accounts: StartDate[]): Promise<BankConnection> {
  return ok(await bookFetch(auth, `/api/bank-feeds/${id}/accounts`, json('PUT', { accounts })))
}

export async function refreshBankConnection(auth: BookAuth, id: number): Promise<BankConnection> {
  return ok(await bookFetch(auth, `/api/bank-feeds/${id}/sync`, json('POST')))
}

export async function removeBankConnection(auth: BookAuth, id: number): Promise<void> {
  const res = await bookFetch(auth, `/api/bank-feeds/${id}`, { method: 'DELETE' })
  if (!res.ok) throw await errorFrom(res)
}
