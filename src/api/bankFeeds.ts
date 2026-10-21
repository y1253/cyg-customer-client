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
  accounts: Array<{
    id: number
    name: string
    mask: string | null
    kind: string
    /** The folder its months are filed under. */
    accountName: string
    currency: string | null
    currentBalance: number | null
  }>
}

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

/** A Plaid Link token; with `itemId`, for signing in to that bank again. */
export async function createLinkToken(auth: BookAuth, itemId?: number): Promise<string> {
  const url = itemId ? `/api/bank-feeds/link-token?itemId=${itemId}` : '/api/bank-feeds/link-token'
  const res = await ok<{ linkToken: string }>(await bookFetch(auth, url, json('POST')))
  return res.linkToken
}

export async function exchangePublicToken(auth: BookAuth, publicToken: string): Promise<BankConnection> {
  return ok(await bookFetch(auth, '/api/bank-feeds/exchange', json('POST', { publicToken })))
}

export async function markReconnected(auth: BookAuth, id: number): Promise<BankConnection> {
  return ok(await bookFetch(auth, `/api/bank-feeds/${id}/reconnected`, json('POST')))
}

export async function refreshBankConnection(auth: BookAuth, id: number): Promise<BankConnection> {
  return ok(await bookFetch(auth, `/api/bank-feeds/${id}/sync`, json('POST')))
}

export async function removeBankConnection(auth: BookAuth, id: number): Promise<void> {
  const res = await bookFetch(auth, `/api/bank-feeds/${id}`, { method: 'DELETE' })
  if (!res.ok) throw await errorFrom(res)
}
