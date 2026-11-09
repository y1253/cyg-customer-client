import { useEffect, useRef, useState } from 'react'

/** Below `lg` the dashboard's own mobile header (h-16) is sticky at the top. */
const stickyTop = () => (window.matchMedia('(min-width: 1024px)').matches ? 0 : 64)

/**
 * step2 (2026-11-09): whether a `sticky` bar is stuck to the top of the window now. Put the
 * returned `sentinel` ref on an empty element right above the bar; `scrollToStart` brings
 * the window back to where the bar starts (a tab change while scrolled down).
 */
export function useStuck() {
  const sentinel = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)
  useEffect(() => {
    const check = () => {
      const el = sentinel.current
      if (el) setStuck(el.getBoundingClientRect().top < stickyTop())
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [])
  const scrollToStart = () => {
    const el = sentinel.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - stickyTop()
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' })
  }
  return { sentinel, stuck, scrollToStart }
}
