import { useCallback, useEffect, useState } from 'react'

/**
 * Draw a long list in pieces: the first `step` rows, then `step` more each time the sentinel
 * row (`setSentinel`) comes near the screen. A new `resetKey` (a filter, a search) starts from
 * the top again; `revealTo(i)` makes sure row `i` is drawn (a link jumping to it). Only the
 * drawing is cut — the caller still filters and counts every row.
 */
export function useRevealMore(total: number, resetKey: string, step = 60) {
  const [shown, setShown] = useState(step)
  // A new filter or search starts from the top (the "previous value in state" pattern).
  const [key, setKey] = useState(resetKey)
  if (key !== resetKey) {
    setKey(resetKey)
    setShown(step)
  }
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null)
  const more = shown < total
  useEffect(() => {
    if (!sentinel || !more) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setShown((n) => n + step)
      },
      { rootMargin: '800px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel, more, step])
  const revealTo = useCallback((index: number) => setShown((n) => Math.max(n, index + 1)), [])
  return { shown: Math.min(shown, total), more, setSentinel, revealTo }
}
