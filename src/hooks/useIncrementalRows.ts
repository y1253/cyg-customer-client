import { useCallback, useEffect, useRef, useState } from 'react'

const PAGE = 100

/**
 * Infinite scroll over rows that are ALREADY loaded (step12): the first `PAGE` rows render,
 * and the next `PAGE` join each time the sentinel (put it after the last row) comes within
 * 600px of view. Sorting, filters and totals keep working on the full list — only the DOM
 * is cut. `joined(next)` keeps a family together: the cut never falls just before a row
 * that belongs to the one above it (a tax line or a split under its transaction).
 * `resetKey` changes (a new filter or sort) start again from the top; a refetch of the same
 * view does not, so an edit halfway down never jumps the page back.
 */
export function useIncrementalRows<T>(rows: T[], resetKey: string, joined?: (row: T) => boolean) {
  const [limit, setLimit] = useState(PAGE)
  const [key, setKey] = useState(resetKey)
  if (key !== resetKey) {
    setKey(resetKey)
    setLimit(PAGE)
  }

  let end = Math.min(limit, rows.length)
  while (joined && end < rows.length && joined(rows[end])) end++
  const hasMore = end < rows.length

  const observer = useRef<IntersectionObserver | null>(null)
  useEffect(() => () => observer.current?.disconnect(), [])
  // A callback ref: the sentinel mounts and unmounts with `hasMore`.
  const sentinelRef = useCallback((node: Element | null) => {
    observer.current?.disconnect()
    if (!node) return
    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setLimit((n) => n + PAGE)
      },
      { rootMargin: '600px' },
    )
    observer.current.observe(node)
  }, [])

  return { shown: hasMore ? rows.slice(0, end) : rows, hasMore, sentinelRef }
}
