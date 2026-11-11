import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * step8 (2026-11-11, `custom.png`): the ledger's columns in the customer's own order and
 * widths — drag a header onto another to move it, drag a header's right edge to resize, reset
 * to go back. Kept in THIS browser only (localStorage `ledger-columns-v1`; user's request:
 * "saved at the browser"). Custom columns (`c<id>`) join the same layout. Phones keep the
 * fixed folded layout; this applies from md up.
 */

export const FIXED_COLUMNS = ['date', 'name', 'description', 'amount', 'debit', 'credit', 'statement'] as const

/** Starting widths in px (the old fixed layout, wider description). */
export const DEFAULT_WIDTHS: Record<string, number> = {
  date: 118,
  name: 200,
  description: 320,
  amount: 132,
  debit: 190,
  credit: 190,
  statement: 210,
}
const CUSTOM_WIDTH = 160
export const MIN_WIDTH = 72
const MAX_WIDTH = 900
const STORAGE_KEY = 'ledger-columns-v1'

interface Saved {
  order: string[]
  widths: Record<string, number>
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const v = raw ? (JSON.parse(raw) as Partial<Saved>) : null
    return {
      order: Array.isArray(v?.order) ? v.order.filter((x): x is string => typeof x === 'string') : [],
      widths: v?.widths && typeof v.widths === 'object' ? v.widths : {},
    }
  } catch {
    return { order: [], widths: {} }
  }
}

function save(v: Saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
  } catch {
    // Private window / blocked storage: the layout just isn't remembered.
  }
}

/**
 * The columns to show, in order: the saved order of those that still exist, then any new one
 * (a fixed column at its default place, a custom one at the end). Pure.
 */
export function orderColumns(saved: readonly string[], available: readonly string[]): string[] {
  const have = new Set(available)
  const out = saved.filter((id) => have.has(id))
  for (const id of available) {
    if (out.includes(id)) continue
    const at = FIXED_COLUMNS.indexOf(id as (typeof FIXED_COLUMNS)[number])
    if (at < 0) {
      out.push(id)
      continue
    }
    // Before the first fixed column that comes after it by default.
    const next = out.findIndex((x) => {
      const i = FIXED_COLUMNS.indexOf(x as (typeof FIXED_COLUMNS)[number])
      return i > at
    })
    if (next < 0) out.push(id)
    else out.splice(next, 0, id)
  }
  return out
}

/** `id` moved to just before `before` (null = to the end). Pure. */
export function moveColumn(order: readonly string[], id: string, before: string | null): string[] {
  if (id === before) return [...order]
  const rest = order.filter((x) => x !== id)
  const at = before === null ? rest.length : rest.indexOf(before)
  rest.splice(at < 0 ? rest.length : at, 0, id)
  return rest
}

export function useLedgerColumns(customIds: readonly number[]) {
  const [saved, setSaved] = useState<Saved>(load)
  useEffect(() => save(saved), [saved])

  const available = useMemo(() => [...FIXED_COLUMNS, ...customIds.map((id) => `c${id}`)], [customIds])
  const order = useMemo(() => orderColumns(saved.order, available), [saved.order, available])
  const widthOf = useCallback(
    (id: string) => saved.widths[id] ?? DEFAULT_WIDTHS[id] ?? CUSTOM_WIDTH,
    [saved.widths],
  )
  const total = order.reduce((n, id) => n + widthOf(id), 0)

  const setWidth = useCallback((id: string, px: number) => {
    const w = Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, px)))
    setSaved((s) => (s.widths[id] === w ? s : { ...s, widths: { ...s.widths, [id]: w } }))
  }, [])
  const move = useCallback(
    (id: string, before: string | null) => setSaved((s) => ({ ...s, order: moveColumn(order, id, before) })),
    [order],
  )
  const reset = useCallback(() => setSaved({ order: [], widths: {} }), [])
  const customized = saved.order.length > 0 || Object.keys(saved.widths).length > 0

  return { order, widthOf, total, setWidth, move, reset, customized }
}

export type LedgerColumns = ReturnType<typeof useLedgerColumns>
