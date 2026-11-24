import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trans, useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { sendEmailCode, verifyEmail } from '@/api/customerAuth'
import { CodeInput } from '@/components/Auth/CodeInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'

/**
 * step12c: an account opened by text has no email. Adding one takes a code emailed to it —
 * then the customer can also sign in with Google or set a password, and get emails from us.
 */
export function AddEmailField() {
  const { t } = useTranslation(['dashboard', 'common'])
  const { token, setCustomer } = useAuth()
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const send = useMutation({
    mutationFn: (address: string) => sendEmailCode(token!, address),
    onSuccess: (out) => setSentTo(out.email),
  })
  const verify = useMutation({
    mutationFn: () => verifyEmail(token!, sentTo!, code),
    onSuccess: (customer) => {
      setCustomer(customer)
      void qc.invalidateQueries({ queryKey: ['customer-me'] })
    },
  })
  const error = send.error ?? verify.error

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="add-email">{t('account.email')}</Label>
      {sentTo ? (
        <div className="flex flex-col gap-3 rounded-xl bg-[#F6F8FA] p-4">
          <p className="text-sm text-muted-foreground">
            <Trans
              t={t}
              i18nKey="addEmail.sentTo"
              values={{ email: sentTo }}
              components={{ b: <span className="font-semibold text-foreground" /> }}
            />
          </p>
          <CodeInput id="add-email-code" label={t('addEmail.code')} value={code} onChange={setCode} />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={code.length !== 6 || verify.isPending}
              onClick={() => verify.mutate()}
              className="bg-brand text-white hover:bg-brand/85"
            >
              {verify.isPending && <Loader2 className="size-4 animate-spin" />}
              {t('addEmail.add')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSentTo(null)
                setCode('')
                verify.reset()
              }}
            >
              {t('addEmail.another')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="add-email"
            type="email"
            autoComplete="email"
            className="h-11"
            placeholder={t('addEmail.placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={!/^\S+@\S+\.\S+$/.test(email.trim()) || send.isPending}
            onClick={() => send.mutate(email.trim())}
          >
            {send.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('addEmail.send')}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}
      {!sentTo && (
        <p className="text-xs text-muted-foreground">
          {t('addEmail.help')}
        </p>
      )}
    </div>
  )
}
