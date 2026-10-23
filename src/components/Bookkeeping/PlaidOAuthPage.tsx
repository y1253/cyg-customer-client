import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { exchangePublicToken, markReconnected } from '@/api/bankFeeds'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { clearPendingLink, openPlaidLink, readPendingLink } from '@/lib/plaid-link'

/**
 * `/plaid/oauth` — a bank that signs in on its own site (OAuth) sends the customer back here.
 * Plaid Link resumes with this URL (`receivedRedirectUri`), then we keep the bank and return
 * to the page the customer connected from.
 */
export function PlaidOAuthPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [pending] = useState(readPendingLink)
  const [failed, setFailed] = useState<string | null>(null)
  const started = useRef(false)
  const error = pending
    ? failed
    : 'This bank connection expired. Please start it again from your bookkeeping page.'

  useEffect(() => {
    if (started.current || !token || !pending) return
    started.current = true
    const auth = { token, companyId: pending.companyId, bookId: pending.bookId ?? null }
    openPlaidLink(pending.token, window.location.href)
      .then(async (publicToken) => {
        if (publicToken) {
          if (pending.itemId) await markReconnected(auth, pending.itemId)
          else await exchangePublicToken(auth, publicToken)
        }
        clearPendingLink()
        navigate(pending.returnTo || '/dashboard/bookkeeping', { replace: true })
      })
      .catch((e: Error) => setFailed(e.message))
  }, [token, navigate, pending])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F8FA] px-4">
      <div className="max-w-sm text-center">
        {error ? (
          <>
            <p className="text-sm text-destructive">{error}</p>
            <Button className="mt-4" onClick={() => navigate('/dashboard/bookkeeping', { replace: true })}>
              Back to bookkeeping
            </Button>
          </>
        ) : (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Finishing your bank connection…
          </p>
        )}
      </div>
    </div>
  )
}
