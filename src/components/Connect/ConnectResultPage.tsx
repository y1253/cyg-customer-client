import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/** The message the registration wizard's opener listens for. */
export const MAILBOX_CONNECT_MESSAGE = 'cyg-mailbox-connect'

/**
 * Where the INTERNAL API's Gmail / Outlook OAuth callback sends the popup back to, for
 * a connect started from the registration wizard (`/connect/:provider/success|error`).
 * Tells the opener and closes. The opener does not rely on this alone: COOP can cut
 * `window.opener`, so it also re-checks on focus and when the popup closes.
 */
export function ConnectResultPage() {
  const { t } = useTranslation(['dashboard', 'common'])
  const { provider, result } = useParams()
  const [params] = useSearchParams()
  const ok = result === 'success'
  const reason = params.get('reason')

  useEffect(() => {
    window.opener?.postMessage(
      { type: MAILBOX_CONNECT_MESSAGE, provider, ok, reason },
      window.location.origin,
    )
    if (ok) window.close()
  }, [provider, ok, reason])

  const name = provider === 'microsoft' ? 'Outlook' : 'Gmail'
  return (
    <div className="flex h-screen items-center justify-center px-6 text-center text-sm text-muted-foreground">
      {ok ? (
        t('connect.connected', { name })
      ) : (
        <div className="max-w-sm">
          <p className="font-medium text-foreground">{t('connect.failed', { name })}</p>
          {reason && <p className="mt-2">{reason}</p>}
          <p className="mt-2">{t('connect.hint')}</p>
        </div>
      )}
    </div>
  )
}
