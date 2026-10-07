import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSignup } from '@/hooks/useSignup'
import { AuthLayout, OrDivider, SUBMIT_CLASS } from './AuthLayout'
import { GoogleButton } from './GoogleButton'

const MIN_PASSWORD = 8

export function SignupPage() {
  const navigate = useNavigate()
  const signup = useSignup()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
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
    signup.mutate({ name, email, password }, { onSuccess: goToDashboard })
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
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            className="h-11"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD} characters.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
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
          {signup.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
