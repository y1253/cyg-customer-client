import { useState } from 'react'
import { CheckCircle2, Eye, EyeOff, Loader2, Mail, Phone } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Mailbox, MailboxProvider } from '@/api/registrations'
import type { FormData } from '../types'

interface Props {
  data: FormData
  onChange: (patch: Partial<FormData>) => void
  mailbox: Mailbox | null
  connecting: boolean
  connectError: string | null
  disconnecting: boolean
  billingPasswordSaved: boolean
  onConnect: (provider: MailboxProvider, kind?: 'work' | 'personal') => void
  onDisconnect: () => void
}

/**
 * How the customer and the firm will talk. Connecting Gmail / Outlook is the main path
 * (the same live connection staff make from the Communications tab); the email +
 * password is a fallback for when connecting does not work, and is optional once a
 * mailbox is connected. The phone line is not a choice: every business gets one, bought
 * when the application is submitted.
 */
export function Step5Communication({
  data,
  onChange,
  mailbox,
  connecting,
  connectError,
  disconnecting,
  billingPasswordSaved,
  onConnect,
  onDisconnect,
}: Props) {
  const { t } = useTranslation(['register', 'common'])
  const [showPassword, setShowPassword] = useState(false)
  const [showFallback, setShowFallback] = useState(
    !mailbox && (data.billingEmail !== '' || billingPasswordSaved),
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Email */}
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{t('communication.connectTitle')}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('communication.connectHint')}
          </p>
        </div>

        {mailbox ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-primary bg-primary/5 p-4">
            <div className="flex min-w-0 items-center gap-2.5 text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="font-medium">
                  {t('communication.connected', { provider: mailbox.provider === 'gmail' ? 'Gmail' : 'Outlook' })}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{mailbox.address}</span>
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={onDisconnect} disabled={disconnecting}>
              {disconnecting ? t('communication.disconnecting') : t('communication.disconnect')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-auto gap-2 py-4"
              disabled={connecting}
              onClick={() => onConnect('gmail')}
            >
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {t('communication.connectGmail')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto gap-2 py-4"
              disabled={connecting}
              onClick={() => onConnect('microsoft', 'work')}
            >
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {t('communication.connectOutlook')}
            </Button>
          </div>
        )}
        {!mailbox && (
          <button
            type="button"
            className="self-start text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            disabled={connecting}
            onClick={() => onConnect('microsoft', 'personal')}
          >
            {t('communication.personalOutlook')}
          </button>
        )}
        {connectError && <p className="text-xs text-destructive">{connectError}</p>}
      </div>

      {/* Fallback: email + password */}
      {!mailbox && (
        <div className="flex flex-col gap-3 border-t pt-5">
          {!showFallback ? (
            <button
              type="button"
              onClick={() => setShowFallback(true)}
              className="self-start text-sm text-primary underline underline-offset-2 hover:opacity-80"
            >
              {t('communication.fallbackLink')}
            </button>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {t('communication.fallbackHint')}
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="billingEmail">
                  {t('communication.emailAddress')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="billingEmail"
                  type="email"
                  value={data.billingEmail}
                  onChange={(e) => onChange({ billingEmail: e.target.value })}
                  placeholder={t('communication.emailPlaceholder')}
                />
                {data.billingEmail && !data.billingEmail.includes('@') && (
                  <p className="text-xs text-destructive">{t('contact.emailInvalid')}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="billingPassword">
                  {t('communication.password')} {!billingPasswordSaved && <span className="text-destructive">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="billingPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={data.billingPassword}
                    onChange={(e) => onChange({ billingPassword: e.target.value })}
                    placeholder={billingPasswordSaved ? t('communication.passwordSaved') : t('communication.passwordPlaceholder')}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPassword ? t('communication.hidePassword') : t('communication.showPassword')}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Phone line — every business gets one */}
      <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
        <Phone className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <Trans t={t} i18nKey="communication.phoneLine" components={{ b: <span className="font-medium" /> }} />
        </p>
      </div>
    </div>
  )
}
