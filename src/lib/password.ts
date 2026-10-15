/** Same minimum as the server. */
export const MIN_PASSWORD = 8

/** What's wrong with a new password + its confirmation, or null. The server checks too. */
export function passwordProblem(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters`
  if (confirm !== password) return 'Passwords do not match'
  return null
}
