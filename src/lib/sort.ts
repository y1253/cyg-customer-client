/**
 * step12 (2026-11-22, user's request): every dropdown lists its items A–Z — case-insensitive, accents ignored,
 * numbers in number order ("Item 2" before "Item 10").
 */
export const byLabel = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })

/** A copy of `list` sorted A–Z by `label`. */
export function sortByLabel<T>(list: readonly T[], label: (item: T) => string): T[] {
  return [...list].sort((a, b) => byLabel(label(a), label(b)))
}
