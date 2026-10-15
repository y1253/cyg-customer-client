import { useState } from 'react'

/**
 * Per-column sort + filter for a table, kept out of the components (pure helpers + one
 * hook). Each column says how to read its value from a row and which kind of filter it
 * takes: text "contains", a number range, or a date range (date-only ISO, compared as text).
 */
export type SortDir = 'asc' | 'desc'
export type ColumnKind = 'text' | 'number' | 'date'

export interface SortState {
  key: string
  dir: SortDir
}

export interface ColumnFilter {
  text?: string
  min?: number | null
  max?: number | null
  from?: string | null
  to?: string | null
}

export interface ColumnDef<T> {
  key: string
  kind: ColumnKind
  /** The value the column sorts and filters on; several = matches if ANY does (text only). */
  value: (row: T) => string | number | null | Array<string | null>
}

export const isActive = (f: ColumnFilter | undefined): boolean =>
  !!f &&
  (!!f.text?.trim() ||
    (f.min !== undefined && f.min !== null) ||
    (f.max !== undefined && f.max !== null) ||
    !!f.from ||
    !!f.to)

const texts = (v: ReturnType<ColumnDef<unknown>['value']>): string[] =>
  (Array.isArray(v) ? v : [v]).map((x) => (x === null || x === undefined ? '' : String(x).toLowerCase()))

/** Does `row` pass the column's filter? A row with no value fails any range filter. */
export function passes<T>(def: ColumnDef<T>, f: ColumnFilter | undefined, row: T): boolean {
  if (!isActive(f)) return true
  const v = def.value(row)
  if (def.kind === 'text') {
    const q = f!.text?.trim().toLowerCase() ?? ''
    return !q || texts(v).some((t) => t.includes(q))
  }
  if (def.kind === 'number') {
    if (typeof v !== 'number') return false
    if (f!.min !== undefined && f!.min !== null && v < f!.min) return false
    if (f!.max !== undefined && f!.max !== null && v > f!.max) return false
    return true
  }
  const d = typeof v === 'string' ? v.slice(0, 10) : ''
  if (!d) return false
  if (f!.from && d < f!.from) return false
  if (f!.to && d > f!.to) return false
  return true
}

/** Ascending comparison on the column's value; empty values always sort last. */
export function compare<T>(def: ColumnDef<T>, a: T, b: T, dir: SortDir): number {
  const va = def.value(a)
  const vb = def.value(b)
  const first = (x: unknown) => (Array.isArray(x) ? (x.find((y) => y) ?? null) : x)
  const xa = first(va)
  const xb = first(vb)
  const emptyA = xa === null || xa === undefined || xa === ''
  const emptyB = xb === null || xb === undefined || xb === ''
  if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1
  const c =
    typeof xa === 'number' && typeof xb === 'number'
      ? xa - xb
      : String(xa).localeCompare(String(xb), undefined, { sensitivity: 'base', numeric: true })
  return dir === 'asc' ? c : -c
}

/** Filter by every active column, then sort (stable — ties keep their order). */
export function applyTable<T>(
  rows: T[],
  defs: ColumnDef<T>[],
  filters: Record<string, ColumnFilter>,
  sort: SortState | null,
): T[] {
  const active = defs.filter((d) => isActive(filters[d.key]))
  const kept = active.length ? rows.filter((r) => active.every((d) => passes(d, filters[d.key], r))) : rows
  const def = sort && defs.find((d) => d.key === sort.key)
  if (!def) return kept
  return kept
    .map((r, i) => ({ r, i }))
    .sort((a, b) => compare(def, a.r, b.r, sort!.dir) || a.i - b.i)
    .map((x) => x.r)
}

/** Sort + filter state for one table. `initialSort` = the table's default order. */
export function useTableControls(initialSort: SortState | null = null) {
  const [sort, setSort] = useState<SortState | null>(initialSort)
  const [filters, setFilters] = useState<Record<string, ColumnFilter>>({})
  const setFilter = (key: string, f: ColumnFilter | null) =>
    setFilters((all) => {
      const next = { ...all }
      if (f && isActive(f)) next[key] = f
      else delete next[key]
      return next
    })
  return {
    sort,
    setSort,
    filters,
    setFilter,
    activeCount: Object.values(filters).filter(isActive).length,
    clearFilters: () => setFilters({}),
  }
}
export type TableControls = ReturnType<typeof useTableControls>
