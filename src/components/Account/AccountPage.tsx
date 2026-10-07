import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SUBMIT_CLASS } from '@/components/Auth/AuthLayout'
import type { Customer } from '@/api/customerAuth'
import { useAuth } from '@/context/AuthContext'
import { useMe } from '@/hooks/useMe'
import { useUpdateMe } from '@/hooks/useUpdateMe'

const METHOD_LABEL = { PASSWORD: 'Email & password', GOOGLE: 'Google' } as const

export function AccountPage() {
  const navigate = useNavigate()
  const { customer: cached, logout } = useAuth()
  const me = useMe()
  const customer = me.data ?? cached

  function onLogout() {
    // Leave the guarded route FIRST: clearing the token while still on /account makes
    // CustomerRoute redirect to /login before this navigation lands.
    navigate('/', { replace: true })
    logout()
  }

  if (!customer) return null

  return (
    <main className="relative isolate min-h-svh bg-[#0B1C2C] px-4 py-10">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,#169f9655,transparent_60%),radial-gradient(ellipse_at_bottom_left,#2830b340,transparent_55%)]"
      />
      <div className="mx-auto flex max-w-xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="CYG Finance home">
            <img src="/site/logo.png" alt="CYG Finance" className="h-12 w-auto brightness-0 invert" />
          </Link>
          <Button
            variant="ghost"
            onClick={onLogout}
            className="h-10 gap-2 px-4 text-white hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" /> Log out
          </Button>
        </div>

        <Card className="rounded-2xl py-8 shadow-2xl">
          <CardHeader className="flex items-center gap-4 px-8">
            {customer.avatarUrl ? (
              <img
                src={customer.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="size-14 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-14 items-center justify-center rounded-full bg-brand text-xl font-bold text-white">
                {customer.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="flex flex-col gap-1">
              <CardTitle className="text-2xl font-bold tracking-[-0.02em] text-brand">
                My account
              </CardTitle>
              <CardDescription className="text-base">{customer.email}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-8">
            <p className="mb-6 text-sm text-muted-foreground">
              Signed in with{' '}
              <span className="rounded-md bg-brand/10 px-2 py-0.5 font-medium text-brand">
                {METHOD_LABEL[customer.authType]}
              </span>
            </p>
            {/* Keyed on the server copy, so the fields re-seed when fresh data lands. */}
            <ProfileForm key={customer.id + ':' + (me.data ? 'fresh' : 'cached')} customer={customer} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function ProfileForm({ customer }: { customer: Customer }) {
  const update = useUpdateMe()
  const [name, setName] = useState(customer.name)
  const [phone, setPhone] = useState(customer.phone ?? '')
  const [saved, setSaved] = useState(false)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaved(false)
    update.mutate({ name, phone: phone.trim() || null }, { onSuccess: () => setSaved(true) })
  }

  return (
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
        <Input id="email" className="h-11" value={customer.email} disabled />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          className="h-11"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      {update.error && (
        <p role="alert" className="text-sm text-destructive">
          {update.error.message}
        </p>
      )}
      {saved && <p className="text-sm text-brand">Saved.</p>}
      <Button type="submit" disabled={update.isPending} className={SUBMIT_CLASS}>
        {update.isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
