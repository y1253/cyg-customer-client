import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * 2026-11-11 (user's request): a wide table's sideways scrollbar, kept at the TOP of the
 * screen while the page scrolls down — the table's own one sits under its last row,
 * thousands of pixels away. A thin `overflow-x-auto` strip as wide as `target`'s content,
 * scrolled in step with it both ways. It sticks at `var(--bk-sticky-top)` (under the
 * Bookkeeping tab bar; 0 inside a dialog) and is not shown when the table fits.
 */
export function StickyScrollbar({ target, className }: { target: HTMLElement | null; className?: string }) {
  const bar = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ content: 0, view: 0 })
  const overflows = size.content > size.view + 1

  // Its width follows the table: columns resize, custom columns come and go, the window too.
  useEffect(() => {
    if (!target) return
    const measure = () => setSize({ content: target.scrollWidth, view: target.clientWidth })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(target)
    if (target.firstElementChild) observer.observe(target.firstElementChild)
    return () => observer.disconnect()
  }, [target])

  // Each one moves the other; `from` stops the echo of our own write coming back.
  useEffect(() => {
    const strip = bar.current
    if (!target || !strip) return
    let from: HTMLElement | null = null
    const sync = (src: HTMLElement, dst: HTMLElement) => () => {
      if (from && from !== src) return
      from = src
      dst.scrollLeft = src.scrollLeft
      requestAnimationFrame(() => (from = null))
    }
    const onTable = sync(target, strip)
    const onStrip = sync(strip, target)
    strip.scrollLeft = target.scrollLeft
    target.addEventListener('scroll', onTable, { passive: true })
    strip.addEventListener('scroll', onStrip, { passive: true })
    return () => {
      target.removeEventListener('scroll', onTable)
      strip.removeEventListener('scroll', onStrip)
    }
  }, [target, overflows])

  if (!overflows) return null
  return (
    <div
      ref={bar}
      aria-hidden
      className={cn(
        'sticky top-(--bk-sticky-top,0px) z-10 overflow-x-auto overflow-y-hidden border-b bg-white/90 backdrop-blur-sm',
        // Always drawn (macOS hides overlay scrollbars until you scroll — this one IS the control).
        '[&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/25 hover:[&::-webkit-scrollbar-thumb]:bg-black/40 [&::-webkit-scrollbar-track]:bg-muted/60',
        className,
      )}
    >
      <div className="h-px" style={{ width: size.content }} />
    </div>
  )
}
