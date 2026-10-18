import { useCallback, useState } from 'react'
import { TurnstileWidget } from '@/components/Auth/Turnstile'
import { useAuthConfig } from '@/hooks/useAuthConfig'

/**
 * The "are you human" token for a form that makes the server send an email (signup,
 * forgot password). A token is good for ONE request, so call `consume()` after each submit
 * — the widget then fetches a fresh one. `required` is false while the server has no
 * Turnstile key, and the form submits without a token, as before.
 */
export function useTurnstile() {
  const config = useAuthConfig()
  const siteKey = config.data?.turnstileSiteKey ?? null
  const [token, setToken] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const consume = useCallback(() => {
    setToken(null)
    setResetKey((k) => k + 1)
  }, [])
  return {
    required: siteKey !== null,
    token: token ?? undefined,
    /** Message to show when the form is submitted before the check has finished. */
    pendingMessage: 'Checking that you are human — try again in a moment.',
    consume,
    widget: <TurnstileWidget siteKey={siteKey} resetKey={resetKey} onToken={setToken} />,
  }
}
