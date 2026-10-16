import { useEffect, useState } from 'react'
import { Loader2, Mail, ShieldCheck } from 'lucide-react'
import { CodeInput, ResendButton } from '@/components/Auth/CodeInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCountdown } from '@/hooks/useCountdown'
import { useSendPortalCode, useVerifyPortalCode } from '@/hooks/usePortal'

/**
 * The email-code gate in front of Communications and Links. Step 1 sends the code,
 * step 2 takes it. The code is good for 5 minutes; a wrong or old one shows the
 * server's own sentence.
 */
export function UnlockGate() {
  const send = useSendPortalCode()
  const verify = useVerifyPortalCode()
  const [code, setCode] = useState('')
  const resend = useCountdown()
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const sent = send.isSuccess || expiresAt !== null

  useEffect(() => {
    if (expiresAt === null) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [expiresAt])

  function requestCode() {
    verify.reset()
    send.mutate(undefined, {
      onSuccess: (r) => {
        setCode('')
        setExpiresAt(Date.now() + r.expiresInSec * 1000)
        setNow(Date.now())
        resend.restart()
      },
    })
  }

  function submit(value = code) {
    if (value.length !== 6 || verify.isPending) return
    verify.mutate(value)
  }

  const left = expiresAt === null ? 0 : Math.max(0, Math.round((expiresAt - now) / 1000))
  const expired = sent && left === 0

  return (
    <Card className="mx-auto w-full max-w-md overflow-hidden">
      <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-[#3BBFB4]/15 to-transparent px-6 pt-8 pb-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3BBFB4]/20 text-[#1f8f86]">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-semibold text-[#0B1C2C]">Confirm it's you</h2>
        <p className="text-sm text-muted-foreground">
          Your messages and saved logins are private. We'll email you a 6-digit code to open
          them.
        </p>
      </div>
      <CardContent className="flex flex-col gap-5 pt-4 pb-8">
        {!sent ? (
          <>
            <Button size="lg" className="gap-2" onClick={requestCode} disabled={send.isPending}>
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {send.isPending ? 'Sending…' : 'Email me a code'}
            </Button>
            {send.error && <p className="text-center text-sm text-destructive">{send.error.message}</p>}
          </>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <p className="text-center text-sm text-muted-foreground">
              We sent a code to <span className="font-medium text-foreground">{send.data?.sentTo}</span>.
            </p>
            <CodeInput
              id="portal-code"
              label="Code"
              value={code}
              onChange={(v) => {
                setCode(v)
                if (v.length === 6) submit(v)
              }}
            />
            <Button type="submit" size="lg" disabled={code.length !== 6 || verify.isPending || expired}>
              {verify.isPending ? 'Checking…' : 'Open'}
            </Button>
            {verify.error && <p className="text-center text-sm text-destructive">{verify.error.message}</p>}
            {send.error && <p className="text-center text-sm text-destructive">{send.error.message}</p>}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className={expired ? 'font-medium text-destructive' : undefined}>
                {expired
                  ? 'This code has expired.'
                  : `Expires in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`}
              </span>
              <ResendButton wait={resend.left} pending={send.isPending} onClick={requestCode} />
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
