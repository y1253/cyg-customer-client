import { useState, type FormEvent } from 'react'
import { SavedCardsCard } from '@/components/Billing/SavedCardsCard'
import { PasswordCard } from './PasswordCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SUBMIT_CLASS } from '@/components/Auth/AuthLayout'
import { PageHeader } from '@/components/Dashboard/PageHeader'
import { CONTACT_METHOD_LABEL, type ContactMethod, type Customer } from '@/api/customerAuth'
import { useAuth } from '@/context/AuthContext'
import { useMe } from '@/hooks/useMe'
import { useUpdateMe } from '@/hooks/useUpdateMe'
import { useIntake } from '@/hooks/useIntake'
import { sendVerb } from '@/lib/intake'

const METHOD_LABEL = { PASSWORD: 'Email & password', GOOGLE: 'Google' } as const

/** Profile, inside the dashboard shell (which owns the logo and Log out). */
export function AccountPage() {
  const { customer: cached } = useAuth()
  const me = useMe()
  const customer = me.data ?? cached

  if (!customer) return null

  return (
    <>
      <PageHeader title="My account" description="Your details, as CYG Finance has them." />
      <Card className="max-w-2xl rounded-2xl border-0 py-8 shadow-sm ring-1 ring-black/5">
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
            <CardTitle className="text-xl font-bold text-[#0B1C2C]">{customer.name}</CardTitle>
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
      {/* The server copy only: a profile cached before `hasPassword` existed lacks it. */}
      {me.data && <PasswordCard customer={me.data} />}
      <SavedCardsCard />
    </>
  )
}

function ProfileForm({ customer }: { customer: Customer }) {
  const intake = useIntake()
  const update = useUpdateMe()
  const [name, setName] = useState(customer.name)
  const [phone, setPhone] = useState(customer.phone ?? '')
  const [contact, setContact] = useState<ContactMethod | null>(customer.preferredContact ?? null)
  const [saved, setSaved] = useState(false)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaved(false)
    update.mutate(
      { name, phone: phone.trim() || null, preferredContact: contact },
      { onSuccess: () => setSaved(true) },
    )
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
        <p className="text-xs text-muted-foreground">
          Receipts you {sendVerb(intake.data)} us from this number go straight into your bookkeeping.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contact">Preferred contact method</Label>
        <Select value={contact} onValueChange={(v) => setContact((v as ContactMethod | null) ?? null)}>
          <SelectTrigger id="contact" className="h-11 w-full">
            <SelectValue>
              {(v: ContactMethod | null) => (v ? CONTACT_METHOD_LABEL[v] : 'No preference')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(CONTACT_METHOD_LABEL) as ContactMethod[]).map((m) => (
              <SelectItem key={m} value={m}>
                {CONTACT_METHOD_LABEL[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">How you'd like us to reach you. Text and WhatsApp need your phone above.</p>
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
