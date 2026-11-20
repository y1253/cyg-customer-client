import type { NameDescription } from '@/api/bookkeeping'

/** step12 (2026-11-20): how many rows of these descriptions are exceptions from their name. */
export function exceptionCount(descriptions: readonly NameDescription[]): number {
  return descriptions.reduce((c, d) => c + (d.exceptions?.reduce((x, e) => x + e.rows, 0) ?? 0), 0)
}
