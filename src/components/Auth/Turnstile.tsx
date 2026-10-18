import { useEffect, useRef, useState } from 'react'

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptPromise: Promise<void> | null = null

/** Loads Cloudflare Turnstile once per page. */
function loadTurnstile(): Promise<void> {
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    if (window.turnstile) return resolve()
    const s = document.createElement('script')
    s.src = SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      scriptPromise = null
      reject(new Error('Could not load the security check'))
    }
    document.head.appendChild(s)
  })
  return scriptPromise
}

/** Invisible unless Cloudflare wants an interaction, when it shows a single checkbox. */
export function TurnstileWidget({
  siteKey,
  resetKey,
  onToken,
}: {
  siteKey: string | null
  resetKey: number
  onToken: (token: string | null) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!siteKey) return
    let cancelled = false
    loadTurnstile()
      .then(() => {
        const el = ref.current
        if (cancelled || !el || !window.turnstile) return
        widgetId.current = window.turnstile.render(el, {
          sitekey: siteKey,
          appearance: 'interaction-only',
          callback: (t: string) => onToken(t),
          'expired-callback': () => onToken(null),
          'error-callback': () => onToken(null),
        })
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message)
      })
    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
      widgetId.current = null
    }
  }, [siteKey, onToken])

  // A used token is dead: ask for a new one after every submit.
  useEffect(() => {
    if (resetKey > 0 && widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current)
    }
  }, [resetKey])

  if (!siteKey) return null
  return (
    <div className="flex flex-col items-center gap-1">
      <div ref={ref} />
      {loadError && (
        <p role="alert" className="text-sm text-destructive">
          {loadError}
        </p>
      )}
    </div>
  )
}
