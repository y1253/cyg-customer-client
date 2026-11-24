import { useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { SavedCardsCard } from '@/components/Billing/SavedCardsCard'
import { PasswordCard } from './PasswordCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { SUBMIT_CLASS } from '@/components/Auth/AuthLayout'
import { PageHeader } from '@/components/Dashboard/PageHeader'
import { displayName, type ContactMethod, type Customer } from '@/api/customerAuth'
import { AddEmailField } from './AddEmailField'
import { useAuth } from '@/context/AuthContext'
import { useMe } from '@/hooks/useMe'
import { useUpdateMe } from '@/hooks/useUpdateMe'
import { useIntake } from '@/hooks/useIntake'
import { sendVerb } from '@/lib/intake'
import { setLang, type Lang } from '@/i18n'

const CONTACT_METHODS: ContactMethod[] = ['EMAIL', 'WHATSAPP', 'SMS', 'CALL']

/** Profile, inside the dashboard shell (which owns the logo and Log out). */
export function AccountPage() {
  const { t } = useTranslation(['dashboard', 'common'])
  const { customer: cached } = useAuth()
  const me = useMe()
  const customer = me.data ?? cached

  if (!customer) return null

  return (
    <>
      <PageHeader title={t('account.title')} description={t('account.description')} />
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
              {displayName(customer).charAt(0).toUpperCase()}
            </span>
          )}
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl font-bold text-[#0B1C2C]">{displayName(customer)}</CardTitle>
            <CardDescription className="text-base">{customer.email ?? customer.phone}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-8">
          <p className="mb-6 text-sm text-muted-foreground">
            <Trans
              t={t}
              i18nKey="account.signedInWith"
              values={{ method: t(`account.method.${customer.authType}`) }}
              components={{ method: <span className="rounded-md bg-brand/10 px-2 py-0.5 font-medium text-brand" /> }}
            />
          </p>
          {/* Keyed on the server copy, so the fields re-seed when fresh data lands. */}
          <ProfileForm key={customer.id + ':' + (me.data ? 'fresh' : 'cached')} customer={customer} />
        </CardContent>
      </Card>
      {/* The server copy only: a profile cached before `hasPassword` existed lacks it. */}
      {/* step12c: a password signs in with the email — an account opened by phone adds one first. */}
      {me.data?.email && <PasswordCard customer={me.data} />}
      <SavedCardsCard />
      <LanguageCard />
    </>
  )
}

/** Français / English — the same choice as the switch in the sidebar (Quebec's Charter). */
function LanguageCard() {
  const { t, i18n } = useTranslation(['dashboard', 'common'])
  // From the hook, so a change made elsewhere (the sidebar switch) re-renders it.
  const lang: Lang = i18n.resolvedLanguage === 'en' ? 'en' : 'fr'
  return (
    <Card className="mt-6 max-w-2xl rounded-2xl border-0 py-8 shadow-sm ring-1 ring-black/5">
      <CardHeader className="px-8">
        <CardTitle className="text-lg font-bold text-[#0B1C2C]">{t('account.language.title')}</CardTitle>
        <CardDescription>{t('account.language.description')}</CardDescription>
      </CardHeader>
      <CardContent className="px-8">
        <Label htmlFor="language" className="sr-only">
          {t('account.language.label')}
        </Label>
        <Select value={lang} onValueChange={(v) => v && setLang(v as Lang)}>
          <SelectTrigger id="language" className="h-11 w-full sm:w-64">
            <SelectValue>{(v: Lang) => t(`common:lang.${v}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fr" lang="fr">
              {t('common:lang.fr')}
            </SelectItem>
            <SelectItem value="en" lang="en">
              {t('common:lang.en')}
            </SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  )
}

function ProfileForm({ customer }: { customer: Customer }) {
  const { t } = useTranslation(['dashboard', 'common'])
  const intake = useIntake()
  const update = useUpdateMe()
  const [name, setName] = useState(customer.name)
  const [phone, setPhone] = useState(customer.phone ?? '')
  const [contact, setContact] = useState<ContactMethod | null>(customer.preferredContact ?? null)
  const [alerts, setAlerts] = useState(customer.transactionAlerts ?? true)
  const [saved, setSaved] = useState(false)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaved(false)
    update.mutate(
      { name, phone: phone.trim() || null, preferredContact: contact, transactionAlerts: alerts },
      { onSuccess: () => setSaved(true) },
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">{t('account.fullName')}</Label>
        <Input
          id="name"
          autoComplete="name"
          className="h-11"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      {customer.email ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t('account.email')}</Label>
          <Input id="email" className="h-11" value={customer.email} disabled />
        </div>
      ) : (
        <AddEmailField />
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">{t('account.phone')}</Label>
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          className="h-11"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {t('account.phoneHelp', { verb: sendVerb(intake.data) })}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contact">{t('account.contact')}</Label>
        <Select value={contact} onValueChange={(v) => setContact((v as ContactMethod | null) ?? null)}>
          <SelectTrigger id="contact" className="h-11 w-full">
            <SelectValue>
              {(v: ContactMethod | null) => (v ? t(`account.contactMethod.${v}`) : t('account.noPreference'))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CONTACT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {t(`account.contactMethod.${m}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t('account.contactHelp')}</p>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="transaction-alerts">{t('account.alerts')}</Label>
          <p className="text-xs text-muted-foreground">{t('account.alertsHelp')}</p>
        </div>
        <Switch id="transaction-alerts" checked={alerts} onCheckedChange={setAlerts} className="mt-0.5" />
      </div>
      {update.error && (
        <p role="alert" className="text-sm text-destructive">
          {update.error.message}
        </p>
      )}
      {saved && <p className="text-sm text-brand">{t('account.saved')}</p>}
      <Button type="submit" disabled={update.isPending} className={SUBMIT_CLASS}>
        {update.isPending ? t('common:actions.saving') : t('account.saveChanges')}
      </Button>
    </form>
  )
}
