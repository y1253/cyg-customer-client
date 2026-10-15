import type { SortState } from '@/lib/table-sort'

/** What a drill-down ledger popup shows: one account and/or one payee, in its own order. */
export interface LedgerScope {
  account?: string | null
  name?: string | null
  /** The order it opens in (e.g. by name, from the income statement). */
  sort?: SortState | null
}

/** "Sorted by name", for a drill-down that lists an account's payees. */
export const BY_NAME: SortState = { key: 'name', dir: 'asc' }
