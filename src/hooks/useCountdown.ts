import { useEffect, useState } from 'react'

/** Matches the server's one-code-a-minute limit. */
export const RESEND_SECONDS = 60

/** Seconds left, ticking down once a second to 0. `restart()` starts it over. */
export function useCountdown(seconds = RESEND_SECONDS) {
  const [left, setLeft] = useState(seconds)

  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left])

  return { left, restart: () => setLeft(seconds) }
}
