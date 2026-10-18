import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCountdown } from '@/hooks/useCountdown'
import { useTurnstile } from '@/hooks/useTurnstile'
import { useForgotPassword } from '@/hooks/useForgotPassword'
import { useResetPassword } from '@/hooks/useResetPassword'
import { AuthLayout, SUBMIT_CLASS } from './AuthLayout'
import { CodeInput, ResendButton } from './CodeInput'
import { passwordProblem } from '@/lib/password'
import { NewPasswordFields } from './NewPasswordFields'

const BACK_TO_LOGIN = (
  <>
    Remembered it?{' '}
    <Link to="/login" className="font-semibold text-brand-light hover:underline">
      Log in
    </Link>
  </>
)

/** Forgot password: email → emailed 6-digit code + new password → signed in. */
export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const forgot = useForgotPassword()
  const human = useTurnstile()
  // The login page hands over whatever was typed in its email field.
  const [email, setEmail] = useState(
    () => (location.state as { email?: string } | null)?.email ?? '',
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setFormError('Enter a valid email address')
    if (human.required && !human.token) return setFormError(human.pendingMessage)
    setFormError(null)
    forgot.mutate(
      { email: email.trim(), turnstileToken: human.token },
      { onSuccess: (out) => setSentTo(out.email), onSettled: human.consume },
    )
  }

  if (sentTo) {
    return (
      <ResetStep
        email={sentTo}
        onDone={() => navigate('/dashboard', { replace: true })}
        onChangeEmail={() => {
          forgot.reset()
          setSentTo(null)
        }}
      />
    )
  }

  const error = formError ?? forgot.error?.message

  return (
    <AuthLayout
      title="Forgot your password?"
      description="We'll email you a code to choose a new one."
      footer={BACK_TO_LOGIN}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            className="h-11"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {human.widget}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={forgot.isPending} className={SUBMIT_CLASS}>
          {forgot.isPending ? 'Sending code…' : 'Send code'}
        </Button>
      </form>
    </AuthLayout>
  )
}

/** Step 2: the code from the email plus the new password. */
function ResetStep({
  email,
  onDone,
  onChangeEmail,
}: {
  email: string
  onDone: () => void
  onChangeEmail: () => void
}) {
  const reset = useResetPassword()
  const resend = useForgotPassword()
  // "Resend" asks forgot-password again, so it needs a fresh token of its own.
  const human = useTurnstile()
  const countdown = useCountdown()
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (code.length !== 6) return setFormError('Enter the 6-digit code from the email')
    const problem = passwordProblem(password, confirm)
    if (problem) return setFormError(problem)
    setFormError(null)
    reset.mutate({ email, code, newPassword: password }, { onSuccess: onDone })
  }

  function onResend() {
    reset.reset()
    if (human.required && !human.token) return setFormError(human.pendingMessage)
    setFormError(null)
    resend.mutate(
      { email, turnstileToken: human.token },
      {
        onSuccess: () => {
          setCode('')
          countdown.restart()
        },
        onSettled: human.consume,
      },
    )
  }

  const error = formError ?? reset.error?.message ?? resend.error?.message

  return (
    <AuthLayout
      title="Choose a new password"
      description="Enter the code we emailed you and your new password."
      footer={BACK_TO_LOGIN}
    >
      <p className="text-sm text-muted-foreground">
        If an account exists for <span className="font-semibold text-foreground">{email}</span>, we
        sent it a 6-digit code. It expires in 10 minutes.
      </p>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <CodeInput id="reset-code" label="Code" value={code} onChange={setCode} />
        <NewPasswordFields
          password={password}
          confirm={confirm}
          onPassword={setPassword}
          onConfirm={setConfirm}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {resend.isSuccess && !error && (
          <p className="text-sm text-muted-foreground">A new code is on its way.</p>
        )}
        {human.widget}
        <Button type="submit" disabled={reset.isPending} className={SUBMIT_CLASS}>
          {reset.isPending ? 'Saving…' : 'Save new password'}
        </Button>
      </form>
      <div className="flex items-center justify-between text-sm">
        <Button variant="link" className="h-auto p-0" onClick={onChangeEmail}>
          Use a different email
        </Button>
        <ResendButton wait={countdown.left} pending={resend.isPending} onClick={onResend} />
      </div>
    </AuthLayout>
  )
}
