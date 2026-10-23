import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { requestPhoneCode, verifyPhoneCode } from '@/api/customerAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { useCountdown } from '@/hooks/useCountdown'
import { useTurnstile } from '@/hooks/useTurnstile'
import { SUBMIT_CLASS } from './AuthLayout'
import { CodeInput, ResendButton } from './CodeInput'

/**
 * step12c: log in with a code texted to the phone on the account — the only way in for an
 * account opened by text, and an option for everyone else.
 */
export function PhoneLoginForm({ onDone }: { onDone: () => void }) {
  const { setSession } = useAuth()
  const human = useTurnstile()
  const [phone, setPhone] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const countdown = useCountdown()

  const request = useMutation({
    mutationFn: (number: string) => requestPhoneCode(number, human.token),
    onSuccess: (out) => {
      setSentTo(out.phone)
      countdown.restart()
    },
    onSettled: human.consume,
  })
  const verify = useMutation({
    mutationFn: () => verifyPhoneCode(sentTo!, code),
    onSuccess: (result) => {
      setSession(result)
      onDone()
    },
  })

  function ask(e?: FormEvent) {
    e?.preventDefault()
    if (phone.replace(/\D/g, '').length < 10) return setFormError('Enter your phone number')
    if (human.required && !human.token) return setFormError(human.pendingMessage)
    setFormError(null)
    request.mutate(phone.trim())
  }

  if (sentTo) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (code.length === 6) verify.mutate()
        }}
        noValidate
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-muted-foreground">
          If <span className="font-semibold text-foreground">{sentTo}</span> is on a CYG Finance account, we just
          texted it a 6-digit code.
        </p>
        <CodeInput id="phone-code" label="Code" value={code} onChange={setCode} />
        {verify.error && (
          <p role="alert" className="text-sm text-destructive">
            {verify.error.message}
          </p>
        )}
        <Button type="submit" disabled={code.length !== 6 || verify.isPending} className={SUBMIT_CLASS}>
          {verify.isPending ? 'Logging in…' : 'Log in'}
        </Button>
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="font-medium text-brand-light hover:underline"
            onClick={() => {
              setSentTo(null)
              setCode('')
              verify.reset()
            }}
          >
            Use another number
          </button>
          <ResendButton wait={countdown.left} pending={request.isPending} onClick={() => ask()} />
        </div>
        {human.widget}
      </form>
    )
  }

  const error = formError ?? request.error?.message
  return (
    <form onSubmit={ask} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(514) 555-1234"
          className="h-11"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={request.isPending} className={SUBMIT_CLASS}>
        {request.isPending ? 'Sending…' : 'Text me a code'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        No account yet? Text our number and reply YES — we open one on your phone.
      </p>
      {human.widget}
    </form>
  )
}
