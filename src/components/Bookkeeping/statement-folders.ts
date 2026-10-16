import type { Statement } from '@/api/bookkeeping'

/**
 * Statements filed in one folder per bank / card account. An account IS its name in the
 * books, so a folder is just the statements sharing `accountName`. Pure, so the grouping
 * is tested rather than eyeballed.
 */
export type StatementFolder = {
  /** The account name; null = the "Not sorted yet" folder. */
  account: string | null
  card: boolean
  statements: Statement[]
  /** Earliest and latest statement dates in the folder (YYYY-MM-DD), for the header. */
  from: string | null
  to: string | null
}

/** The server's fallback for a read statement with no account printed (`'Bank account'`). */
export const DEFAULT_ACCOUNT = 'Bank account'

/** A statement that has rows — the only kind that can be moved. */
export function isFiled(s: Statement): boolean {
  return s.status === 'DONE' || s.status === 'NEEDS_REVIEW'
}

/** The folder a statement belongs to; null while it has not been read. */
export function folderOf(s: Statement): string | null {
  if (!isFiled(s)) return s.accountName
  return s.accountName ?? DEFAULT_ACCOUNT
}

const newestFirst = (a: Statement, b: Statement) =>
  (b.periodEnd ?? b.createdAt).localeCompare(a.periodEnd ?? a.createdAt)

/** Folders sorted by name, statements newest first; the unsorted folder last. */
export function groupByAccount(statements: Statement[]): StatementFolder[] {
  const byName = new Map<string | null, Statement[]>()
  for (const s of statements) {
    const k = folderOf(s)
    byName.set(k, [...(byName.get(k) ?? []), s])
  }
  const folders = [...byName.entries()].map(([account, list]): StatementFolder => {
    const starts = list.map((s) => s.periodStart).filter((d): d is string => !!d).sort()
    const ends = list.map((s) => s.periodEnd).filter((d): d is string => !!d).sort()
    return {
      account,
      card: list.some((s) => s.accountKind === 'CREDIT_CARD'),
      statements: [...list].sort(newestFirst),
      from: starts[0] ?? null,
      to: ends[ends.length - 1] ?? null,
    }
  })
  return folders.sort((a, b) => {
    if (a.account === null) return 1
    if (b.account === null) return -1
    return a.account.localeCompare(b.account, undefined, { sensitivity: 'base' })
  })
}
