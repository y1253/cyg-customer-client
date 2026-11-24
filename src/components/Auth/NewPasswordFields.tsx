import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { MIN_PASSWORD } from '@/lib/password'
import { PasswordInput } from './PasswordInput'

/** "New password" + "Confirm new password", with the live mismatch hint. */
export function NewPasswordFields({
  password,
  confirm,
  onPassword,
  onConfirm,
}: {
  password: string
  confirm: string
  onPassword: (value: string) => void
  onConfirm: (value: string) => void
}) {
  const { t } = useTranslation('auth')
  const mismatch = confirm.length > 0 && confirm !== password
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-password">{t('fields.newPassword')}</Label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          className="h-11"
          value={password}
          onChange={(e) => onPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{t('password.minHint', { min: MIN_PASSWORD })}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm-new-password">{t('fields.confirmNewPassword')}</Label>
        <PasswordInput
          id="confirm-new-password"
          autoComplete="new-password"
          className="h-11"
          value={confirm}
          aria-invalid={mismatch}
          onChange={(e) => onConfirm(e.target.value)}
        />
        {mismatch && <p className="text-xs text-destructive">{t('password.mismatchHint')}</p>}
      </div>
    </>
  )
}
