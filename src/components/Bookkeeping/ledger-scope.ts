import type { SortState } from '@/lib/table-sort'

/** What a drill-down ledger popup shows: one account and/or one payee, in its own order. */
export interface LedgerScope {
  account?: string | null
  name?: string | null
  /** The order it opens in (e.g. by name, from the income statement). */
  sort?: SortState | null
  /** The report period it was opened from (date-only ISO; null = open-ended). */
  from?: string | null
  to?: string | null
}

/** "Sorted by name", for a drill-down that lists an account's payees. */
export const BY_NAME: SortState = { key: 'name', dir: 'asc' }
/** "Sorted by description" — the Unclarified name list opens A→Z by it (step8): every row there
 *  has the same name, and like descriptions side by side are what the customer names together. */
export const BY_DESCRIPTION: SortState = { key: 'description', dir: 'asc' }
