import { errorFrom, fetchWithAuth, safeFetch } from './client'

export type AuthType = 'PASSWORD' | 'GOOGLE'

export type Customer = {
  id: number
  name: string
  email: string
  authType: AuthType
  /** False for an account created through Google that never set a password. */
  hasPassword: boolean
  avatarUrl: string | null
  phone: string | null
  /** How they prefer to be contacted; null = not chosen. Absent on a profile cached before step12. */
  preferredContact?: ContactMethod | null
  createdAt: string
}

export type ContactMethod = 'EMAIL' | 'WHATSAPP' | 'SMS'
export const CONTACT_METHOD_LABEL: Record<ContactMethod, string> = {
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  SMS: 'Text message',
}

export type AuthResult = { access_token: string; customer: Customer }

export type SignupValues = {
  name: string
  email: string
  password: string
  /** Cloudflare Turnstile token, when the server has the check on. */
  turnstileToken?: string
}
export type SignupStarted = { email: string }
export type VerifySignupValues = { email: string; code: string }
export type LoginValues = { email: string; password: string }
export type UpdateMeValues = { name?: string; phone?: string | null; preferredContact?: ContactMethod | null }
export type ResetPasswordValues = { email: string; code: string; newPassword: string }
/** `currentPassword` when the account has one; otherwise the emailed `code`. */
export type ChangePasswordValues = { currentPassword?: string; code?: string; newPassword: string }

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await safeFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw await errorFrom(res)
  return (await res.json()) as T
}

/** Step 1: emails a 6-digit code. The account exists only after `verifySignup`. */
export function signup(values: SignupValues): Promise<SignupStarted> {
  return postJson('/api/customer-auth/signup', values)
}

export function verifySignup(values: VerifySignupValues): Promise<AuthResult> {
  return postJson('/api/customer-auth/signup/verify', values)
}

export function resendSignupCode(email: string): Promise<SignupStarted> {
  return postJson('/api/customer-auth/signup/resend', { email })
}

/** Emails a code if the account exists; answers the same either way. */
export function forgotPassword(email: string, turnstileToken?: string): Promise<SignupStarted> {
  return postJson('/api/customer-auth/password/forgot', { email, turnstileToken })
}

/** Saves the new password and signs in. */
export function resetPassword(values: ResetPasswordValues): Promise<AuthResult> {
  return postJson('/api/customer-auth/password/reset', values)
}

export function login(values: LoginValues): Promise<AuthResult> {
  return postJson('/api/customer-auth/login', values)
}

/** `credential` is the ID token Google's button hands the page. */
export function googleLogin(credential: string): Promise<AuthResult> {
  return postJson('/api/customer-auth/google', { credential })
}

export type AuthConfig = {
  googleClientId: string | null
  /** Null = the server does not ask for the "are you human" check. */
  turnstileSiteKey: string | null
}

export async function fetchAuthConfig(): Promise<AuthConfig> {
  const res = await safeFetch('/api/customer-auth/config')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function fetchMe(token: string): Promise<Customer> {
  const res = await fetchWithAuth(token, '/api/customer-auth/me')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function updateMe(token: string, values: UpdateMeValues): Promise<Customer> {
  const res = await fetchWithAuth(token, '/api/customer-auth/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  })
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** Returns a fresh session: every other device is signed out by the change. */
export async function changePassword(
  token: string,
  values: ChangePasswordValues,
): Promise<AuthResult> {
  const res = await fetchWithAuth(token, '/api/customer-auth/me/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  })
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** For an account with no password yet: emails a code to set one. */
export async function sendPasswordCode(token: string): Promise<SignupStarted> {
  const res = await fetchWithAuth(token, '/api/customer-auth/me/password/code', {
    method: 'POST',
  })
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}
