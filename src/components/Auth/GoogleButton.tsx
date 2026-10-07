import { useEffect, useRef, useState } from 'react'
import { useAuthConfig } from '@/hooks/useAuthConfig'
import { useGoogleLogin } from '@/hooks/useGoogleLogin'

type GoogleId = {
  initialize: (opts: {
    client_id: string
    callback: (res: { credential?: string }) => void
  }) => void
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client'
let gsiPromise: Promise<void> | null = null

/** Loads Google Identity Services once per page, however many buttons mount. */
function loadGsi(): Promise<void> {
  gsiPromise ??= new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const s = document.createElement('script')
    s.src = GSI_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      gsiPromise = null
      reject(new Error('Could not load Google sign-in'))
    }
    document.head.appendChild(s)
  })
  return gsiPromise
}

/**
 * Google's own "Sign in with Google" button. Google hands back an ID token, which the
 * server verifies before signing the customer in (or creating their account).
 * Renders nothing when the server has no Google client id configured.
 */
export function GoogleButton({
  text = 'continue_with',
  onSuccess,
}: {
  text?: 'signin_with' | 'signup_with' | 'continue_with'
  onSuccess: () => void
}) {
  const config = useAuthConfig()
  const google = useGoogleLogin()
  const ref = useRef<HTMLDivElement>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  // GSI registers its callback once; keep it pointed at the latest handlers.
  const handlers = useRef({ google, onSuccess })
  useEffect(() => {
    handlers.current = { google, onSuccess }
  })

  const clientId = config.data?.googleClientId

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    loadGsi()
      .then(() => {
        const el = ref.current
        const id = window.google?.accounts.id
        if (cancelled || !el || !id) return
        id.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            if (!credential) return
            handlers.current.google.mutate(credential, {
              onSuccess: () => handlers.current.onSuccess(),
            })
          },
        })
        id.renderButton(el, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text,
          width: Math.min(el.offsetWidth || 352, 400),
        })
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [clientId, text])

  if (!clientId) return null

  return (
    <div className="flex flex-col gap-2">
      <div ref={ref} className="flex min-h-11 w-full justify-center" />
      {google.isPending && (
        <p className="text-center text-sm text-muted-foreground">Signing you in…</p>
      )}
      {(google.error || loadError) && (
        <p role="alert" className="text-center text-sm text-destructive">
          {google.error?.message ?? loadError}
        </p>
      )}
    </div>
  )
}
