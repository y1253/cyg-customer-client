import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useResendSignupCode } from '@/hooks/useResendSignupCode'
import { useSignup } from '@/hooks/useSignup'
import { useVerifySignup } from '@/hooks/useVerifySignup'
import { AuthLayout, OrDivider, SUBMIT_CLASS } from './AuthLayout'
import { GoogleButton } from './GoogleButton'
import { PasswordInput } from './PasswordInput'

const MIN_PASSWORD = 8
/** Matches the server's one-code-a-minute limit. */
const RESEND_SECONDS = 60

export function SignupPage() {
  const navigate = useNavigate()
  const signup = useSignup()
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
    if (!name.trim()) return setFormError('Name is required')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setFormError('Enter a valid email address')
    if (password.length < MIN_PASSWORD) {
      return setFormError(`Password must be at least ${MIN_PASSWORD} characters`)
    }
    if (confirm !== password) return setFormError('Passwords do not match')
    setFormError(null)
    signup.mutate({ name, email, password }, { onSuccess: (out) => setSentTo(out.email) })
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
      title="Create your account"
      description="Sign up with Google or with your email."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-light hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <GoogleButton text="signup_with" onSuccess={goToDashboard} />
      <OrDivider />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            autoComplete="name"
            className="h-11"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
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
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            className="h-11"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD} characters.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            className="h-11"
            value={confirm}
            aria-invalid={confirm.length > 0 && confirm !== password}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {confirm.length > 0 && confirm !== password && (
            <p className="text-xs text-destructive">Passwords do not match.</p>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={signup.isPending} className={SUBMIT_CLASS}>
          {signup.isPending ? 'Sending code…' : 'Create account'}
        </Button>
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
  const verify = useVerifySignup()
  const resend = useResendSignupCode()
  const [code, setCode] = useState('')
  const [wait, setWait] = useState(RESEND_SECONDS)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

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
        setWait(RESEND_SECONDS)
      },
    })
  }

  const error = verify.error?.message ?? resend.error?.message

  return (
    <AuthLayout
      title="Check your email"
      description="Enter the code we sent to confirm your email address."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-light hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>. It
        expires in 10 minutes.
      </p>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-code">Verification code</Label>
          <Input
            id="signup-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            placeholder="123456"
            className="h-12 text-center text-2xl tracking-[0.5em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {resend.isSuccess && !error && (
          <p className="text-sm text-muted-foreground">A new code is on its way.</p>
        )}
        <Button
          type="submit"
          disabled={verify.isPending || code.length !== 6}
          className={SUBMIT_CLASS}
        >
          {verify.isPending ? 'Verifying…' : 'Verify and create account'}
        </Button>
      </form>
      <div className="flex items-center justify-between text-sm">
        <Button variant="link" className="h-auto p-0" onClick={onChangeEmail}>
          Use a different email
        </Button>
        <Button
          variant="link"
          className="h-auto p-0"
          disabled={wait > 0 || resend.isPending}
          onClick={onResend}
        >
          {resend.isPending ? 'Sending…' : wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
        </Button>
      </div>
    </AuthLayout>
  )
}
