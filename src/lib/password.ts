import i18n from '@/i18n'

/** Same minimum as the server. */
export const MIN_PASSWORD = 8

/** What's wrong with a new password + its confirmation, or null. The server checks too. */
export function passwordProblem(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return i18n.t('auth:password.tooShort', { min: MIN_PASSWORD })
  if (confirm !== password) return i18n.t('auth:password.mismatch')
  return null
}
