import { useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { MIN_PASSWORD } from '@/lib/password'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCountdown } from '@/hooks/useCountdown'
import { useTurnstile } from '@/hooks/useTurnstile'
import { useResendSignupCode } from '@/hooks/useResendSignupCode'
import { useSignup } from '@/hooks/useSignup'
import { useVerifySignup } from '@/hooks/useVerifySignup'
import { AuthLayout, OrDivider, SUBMIT_CLASS } from './AuthLayout'
import { CodeInput, ResendButton } from './CodeInput'
import { GoogleButton } from './GoogleButton'
import { PasswordInput } from './PasswordInput'

export function SignupPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const signup = useSignup()
  const human = useTurnstile()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  /** Set once the code is emailed: the page switches to the code step. */
  const [sentTo, setSentTo] = useState<string | null>(null)
  const goToDashboard = () => navigate('/dashboard', { replace: true })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    // The server validates too; this only saves a round trip on the obvious cases.
    if (!name.trim()) return setFormError(t('errors.nameRequired'))
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setFormError(t('errors.invalidEmail'))
    if (password.length < MIN_PASSWORD) {
      return setFormError(t('password.tooShort', { min: MIN_PASSWORD }))
    }
    if (confirm !== password) return setFormError(t('password.mismatch'))
    if (human.required && !human.token) return setFormError(human.pendingMessage)
    setFormError(null)
    signup.mutate(
      { name, email, password, turnstileToken: human.token },
      { onSuccess: (out) => setSentTo(out.email), onSettled: human.consume },
    )
  }

  if (sentTo) {
    return (
      <VerifyStep
        email={sentTo}
        onVerified={goToDashboard}
        onChangeEmail={() => {
          signup.reset()
          setSentTo(null)
        }}
      />
    )
  }

  const error = formError ?? signup.error?.message

  return (
    <AuthLayout
      title={t('signup.title')}
      description={t('signup.description')}
      footer={
        <>
          {t('signup.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-brand-light hover:underline">
            {t('signup.logIn')}
          </Link>
        </>
      }
    >
      <GoogleButton text="signup_with" onSuccess={goToDashboard} />
      <OrDivider />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">{t('fields.fullName')}</Label>
          <Input
            id="name"
            autoComplete="name"
            className="h-11"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t('fields.email')}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="h-11"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t('fields.password')}</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            className="h-11"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t('password.minHint', { min: MIN_PASSWORD })}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-password">{t('fields.confirmPassword')}</Label>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            className="h-11"
            value={confirm}
            aria-invalid={confirm.length > 0 && confirm !== password}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {confirm.length > 0 && confirm !== password && (
            <p className="text-xs text-destructive">{t('password.mismatchHint')}</p>
          )}
        </div>
        {human.widget}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={signup.isPending} className={SUBMIT_CLASS}>
          {signup.isPending ? t('signup.sendingCode') : t('signup.submit')}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          <Trans t={t} i18nKey="signup.terms" components={{ privacy: <Link to="/privacy" className="underline hover:text-foreground" /> }} />
        </p>
      </form>
    </AuthLayout>
  )
}

/** Step 2: the 6-digit code from the email. The account is created when it checks out. */
function VerifyStep({
  email,
  onVerified,
  onChangeEmail,
}: {
  email: string
  onVerified: () => void
  onChangeEmail: () => void
}) {
  const { t } = useTranslation('auth')
  const verify = useVerifySignup()
  const resend = useResendSignupCode()
  const [code, setCode] = useState('')
  const countdown = useCountdown()

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (code.length !== 6) return
    verify.mutate({ email, code }, { onSuccess: onVerified })
  }

  function onResend() {
    verify.reset()
    resend.mutate(email, {
      onSuccess: () => {
        setCode('')
        countdown.restart()
      },
    })
  }

  const error = verify.error?.message ?? resend.error?.message

  return (
    <AuthLayout
      title={t('signup.verifyTitle')}
      description={t('signup.verifyDescription')}
      footer={
        <>
          {t('signup.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-brand-light hover:underline">
            {t('signup.logIn')}
          </Link>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        <Trans t={t} i18nKey="signup.sentTo" values={{ email }} components={{ b: <b className="font-semibold text-foreground" /> }} />
      </p>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <CodeInput id="signup-code" label={t('fields.verificationCode')} value={code} onChange={setCode} />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {resend.isSuccess && !error && (
          <p className="text-sm text-muted-foreground">{t('code.newOnItsWay')}</p>
        )}
        <Button
          type="submit"
          disabled={verify.isPending || code.length !== 6}
          className={SUBMIT_CLASS}
        >
          {verify.isPending ? t('signup.verifying') : t('signup.verifySubmit')}
        </Button>
      </form>
      <div className="flex items-center justify-between text-sm">
        <Button variant="link" className="h-auto p-0" onClick={onChangeEmail}>
          {t('signup.otherEmail')}
        </Button>
        <ResendButton wait={countdown.left} pending={resend.isPending} onClick={onResend} />
      </div>
    </AuthLayout>
  )
}
