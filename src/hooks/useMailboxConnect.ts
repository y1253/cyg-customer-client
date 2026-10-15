import { useCallback, useEffect, useRef, useState } from 'react'
import { getRegistration, mailboxAuthUrl, type Mailbox, type MailboxProvider } from '@/api/registrations'
import { MAILBOX_CONNECT_MESSAGE } from '@/components/Connect/ConnectResultPage'
import { useAuth } from '@/context/AuthContext'

/**
 * Connects Gmail / Outlook to a draft application through a popup (the internal API's
 * existing OAuth flow; its callback sends the popup to `/connect/...`).
 *
 * The popup is opened SYNCHRONOUSLY in the click and pointed at Google/Microsoft once
 * the URL arrives; an `await` in front of `window.open` gets it blocked. Done-ness is
 * read from any of: the popup's message, the window regaining focus, or the popup
 * closing (COOP can cut `window.opener`, so the message alone is not enough). Each one
 * just re-reads the mailbox from the server, which is the truth.
 */
export function useMailboxConnect(id: number, initial: Mailbox | null) {
  const { token } = useAuth()
  const [mailbox, setMailbox] = useState<Mailbox | null>(initial)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cleanup = useRef<(() => void) | null>(null)

  useEffect(() => () => cleanup.current?.(), [])

  const refresh = useCallback(async () => {
    try {
      const r = await getRegistration(token!, id)
      setMailbox(r.mailbox)
      return r.mailbox
    } catch {
      return null
    }
  }, [token, id])

  const connect = useCallback(
    (provider: MailboxProvider, kind: 'work' | 'personal' = 'work') => {
      setError(null)
      const popup = window.open('', `${provider}-oauth`, 'width=500,height=650')
      if (!popup) {
        setError('Your browser blocked the sign-in window. Allow pop-ups for this site and try again.')
        return
      }
      setConnecting(true)
      let finished = false
      const finish = async (reason?: string | null) => {
        if (finished) return
        finished = true
        cleanup.current?.()
        const box = await refresh()
        setConnecting(false)
        if (!box && reason) setError(reason)
      }
      const onMessage = (e: MessageEvent) => {
        if (e.origin !== window.location.origin || e.data?.type !== MAILBOX_CONNECT_MESSAGE) return
        void finish(e.data.ok ? null : (e.data.reason ?? 'The mailbox could not be connected.'))
      }
      const onFocus = () => void refresh()
      const poll = window.setInterval(() => {
        if (popup.closed) void finish()
      }, 500)
      window.addEventListener('message', onMessage)
      window.addEventListener('focus', onFocus)
      cleanup.current = () => {
        window.clearInterval(poll)
        window.removeEventListener('message', onMessage)
        window.removeEventListener('focus', onFocus)
        cleanup.current = null
      }

      mailboxAuthUrl(token!, id, provider, kind)
        .then(({ authUrl }) => {
          popup.location.href = authUrl
        })
        .catch((err: unknown) => {
          popup.close()
          void finish(err instanceof Error ? err.message : 'Could not start the connection.')
        })
    },
    [token, id, refresh],
  )

  return { mailbox, setMailbox, connect, connecting, error }
}
