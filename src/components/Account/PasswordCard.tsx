import { useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CodeInput, ResendButton } from '@/components/Auth/CodeInput'
import { NewPasswordFields } from '@/components/Auth/NewPasswordFields'
import { PasswordInput } from '@/components/Auth/PasswordInput'
import { SUBMIT_CLASS } from '@/components/Auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import type { Customer } from '@/api/customerAuth'
import { useChangePassword } from '@/hooks/useChangePassword'
import { useCountdown } from '@/hooks/useCountdown'
import { useSendPasswordCode } from '@/hooks/useSendPasswordCode'
import { passwordProblem } from '@/lib/password'

/**
 * Account page: change the password (current one required), or — for an account created
 * through Google — set a first one with an emailed code. Other devices are signed out.
 */
export function PasswordCard({ customer }: { customer: Customer }) {
  const { t } = useTranslation(['dashboard', 'common'])
  const change = useChangePassword()
  const sendCode = useSendPasswordCode()
  const countdown = useCountdown()
  const [current, setCurrent] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  /** Accounts without a password get the form only once a code is emailed. */
  const [codeSent, setCodeSent] = useState(false)
  const hasPassword = customer.hasPassword

  function onSendCode() {
    change.reset()
    setFormError(null)
    sendCode.mutate(undefined, {
      onSuccess: () => {
        setCode('')
        setCodeSent(true)
        countdown.restart()
      },
    })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setDone(false)
    if (hasPassword && !current) return setFormError(t('password.errCurrent'))
    if (!hasPassword && code.length !== 6) {
      return setFormError(t('password.errCode'))
    }
    const problem = passwordProblem(password, confirm)
    if (problem) return setFormError(problem)
    setFormError(null)
    change.mutate(
      hasPassword
        ? { currentPassword: current, newPassword: password }
        : { code, newPassword: password },
      {
        onSuccess: () => {
          setCurrent('')
          setCode('')
          setPassword('')
          setConfirm('')
          setCodeSent(false)
          setDone(true)
        },
      },
    )
  }

  const error = formError ?? change.error?.message ?? sendCode.error?.message
  const showForm = hasPassword || codeSent

  return (
    <Card className="mt-6 max-w-2xl rounded-2xl border-0 py-8 shadow-sm ring-1 ring-black/5">
      <CardHeader className="px-8">
        <CardTitle className="text-lg font-bold text-[#0B1C2C]">
          {hasPassword ? t('password.titleChange') : t('password.titleSet')}
        </CardTitle>
        <CardDescription>
          {hasPassword ? t('password.descChange') : t('password.descSet')}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8">
        {done && <p className="mb-4 text-sm text-brand">{t('password.changed')}</p>}
        {!showForm ? (
          <div className="flex flex-col gap-4">
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="button"
              disabled={sendCode.isPending}
              className={SUBMIT_CLASS}
              onClick={onSendCode}
            >
              {sendCode.isPending ? t('password.sendingCode') : t('password.emailCode')}
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            {hasPassword ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="current-password">{t('password.current')}</Label>
                <PasswordInput
                  id="current-password"
                  autoComplete="current-password"
                  className="h-11"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  <Trans
                    t={t}
                    i18nKey="password.sentTo"
                    values={{ email: customer.email }}
                    components={{ b: <span className="font-semibold text-foreground" /> }}
                  />
                </p>
                <CodeInput id="password-code" label={t('password.code')} value={code} onChange={setCode} />
              </>
            )}
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
            <Button type="submit" disabled={change.isPending} className={SUBMIT_CLASS}>
              {change.isPending
                ? t('common:actions.saving')
                : hasPassword
                  ? t('password.submitChange')
                  : t('password.submitSet')}
            </Button>
            {!hasPassword && (
              <div className="text-sm">
                <ResendButton
                  wait={countdown.left}
                  pending={sendCode.isPending}
                  onClick={onSendCode}
                />
              </div>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  )
}
