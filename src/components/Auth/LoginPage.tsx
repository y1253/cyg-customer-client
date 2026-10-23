import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLogin } from '@/hooks/useLogin'
import { AuthLayout, OrDivider, SUBMIT_CLASS } from './AuthLayout'
import { GoogleButton } from './GoogleButton'
import { PasswordInput } from './PasswordInput'
import { PhoneLoginForm } from './PhoneLoginForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [method, setMethod] = useState<'email' | 'phone'>('email')
  const goToDashboard = () => navigate('/dashboard', { replace: true })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    login.mutate({ email, password }, { onSuccess: goToDashboard })
  }

  return (
    <AuthLayout
      title="Log in"
      description="Welcome back to CYG Finance."
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="font-semibold text-brand-light hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <GoogleButton text="signin_with" onSuccess={goToDashboard} />
      <OrDivider />
      {/* step12c: or a code texted to the phone on the account. */}
      <Tabs value={method} onValueChange={(v) => setMethod(v as 'email' | 'phone')} className="gap-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="phone">Phone</TabsTrigger>
        </TabsList>
        <TabsContent value="phone">
          <PhoneLoginForm onDone={goToDashboard} />
        </TabsContent>
        <TabsContent value="email">
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  state={{ email: email.trim() }}
                  className="text-sm font-medium text-brand-light hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                className="h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {login.error && (
              <p role="alert" className="text-sm text-destructive">
                {login.error.message}
              </p>
            )}
            <Button type="submit" disabled={login.isPending} className={SUBMIT_CLASS}>
              {login.isPending ? 'Logging in…' : 'Log in'}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </AuthLayout>
  )
}
