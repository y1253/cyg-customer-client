import { useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('auth')
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
    if (phone.replace(/\D/g, '').length < 10) return setFormError(t('errors.enterPhone'))
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
          <Trans t={t} i18nKey="phone.sentTo" values={{ phone: sentTo }} components={{ b: <b className="font-semibold text-foreground" /> }} />
        </p>
        <CodeInput id="phone-code" label={t('fields.code')} value={code} onChange={setCode} />
        {verify.error && (
          <p role="alert" className="text-sm text-destructive">
            {verify.error.message}
          </p>
        )}
        <Button type="submit" disabled={code.length !== 6 || verify.isPending} className={SUBMIT_CLASS}>
          {verify.isPending ? t('login.submitting') : t('login.submit')}
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
            {t('phone.otherNumber')}
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
        <Label htmlFor="phone">{t('fields.phone')}</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={t('fields.phonePlaceholder')}
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
        {request.isPending ? t('phone.sending') : t('phone.submit')}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {t('phone.noAccount')}
      </p>
      {human.widget}
    </form>
  )
}
