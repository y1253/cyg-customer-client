import { errorFrom, fetchWithAuth, safeFetch } from './client'

export type AuthType = 'PASSWORD' | 'GOOGLE'

export type Customer = {
  id: number
  name: string
  email: string
  authType: AuthType
  avatarUrl: string | null
  phone: string | null
  createdAt: string
}

export type AuthResult = { access_token: string; customer: Customer }

export type SignupValues = { name: string; email: string; password: string }
export type LoginValues = { email: string; password: string }
export type UpdateMeValues = { name?: string; phone?: string | null }

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await safeFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw await errorFrom(res)
  return (await res.json()) as T
}

export function signup(values: SignupValues): Promise<AuthResult> {
  return postJson('/api/customer-auth/signup', values)
}

export function login(values: LoginValues): Promise<AuthResult> {
  return postJson('/api/customer-auth/login', values)
}

/** `credential` is the ID token Google's button hands the page. */
export function googleLogin(credential: string): Promise<AuthResult> {
  return postJson('/api/customer-auth/google', { credential })
}

export async function fetchAuthConfig(): Promise<{ googleClientId: string | null }> {
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
