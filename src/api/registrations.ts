import { errorFrom, fetchWithAuth } from './client'

/**
 * The registration wizard talks to the INTERNAL API (internal.cygfinance.com), not to
 * the customer API: the company, its tasks and its phone number all live there. The
 * customer's own token is accepted by that server's `CustomerJwtGuard`.
 *
 * Dev: `/internal-api` is proxied by Vite to the internal server on :3000. Production:
 * `VITE_INTERNAL_API_URL=https://internal.cygfinance.com/api` at build time (that API
 * already answers CORS for any origin).
 */
export const INTERNAL_API: string =
  (import.meta.env.VITE_INTERNAL_API_URL as string | undefined)?.replace(/\/$/, '') ??
  '/internal-api'

const url = (path: string) => `${INTERNAL_API}/registrations${path}`

export type MailboxProvider = 'gmail' | 'microsoft'

export type Mailbox = { provider: MailboxProvider; address: string }

export type RegistrationSummary = {
  id: number
  businessName: string | null
  isDraft: boolean
  supportNumber: string | null
  createdAt: string
  submittedAt: string | null
  /** Index into the saved steps; past the last one = only the terms are left. */
  resumeStep: number | null
}

export type Registration = {
  id: number
  isDraft: boolean
  supportNumber: string | null
  submittedAt: string | null
  answers: Record<string, Record<string, unknown>>
  resumeStep: number
  mailbox: Mailbox | null
  billingPasswordSaved: boolean
}

export type SubmitBody = {
  cardHolderName: string
  cardNumber: string
  cardExpiry: string
  cardCvv: string
  termsAccepted: boolean
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  ...(body !== undefined && { body: JSON.stringify(body) }),
})

async function call<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetchWithAuth(token, url(path), init)
  } catch {
    throw new Error('Could not reach the server. Please check your connection and try again.')
  }
  if (!res.ok) throw await errorFrom(res)
  return (await res.json()) as T
}

export const listRegistrations = (token: string) =>
  call<RegistrationSummary[]>(token, '')

export const createRegistration = (token: string) =>
  call<{ id: number }>(token, '', json('POST'))

export const getRegistration = (token: string, id: number) =>
  call<Registration>(token, `/${id}`)

export const discardRegistration = (token: string, id: number) =>
  call<{ deleted: boolean }>(token, `/${id}`, json('DELETE'))

export const saveRegistrationStep = (
  token: string,
  id: number,
  key: string,
  body: Record<string, unknown>,
) => call<{ resumeStep: number }>(token, `/${id}/steps/${key}`, json('PUT', body))

export const mailboxAuthUrl = (
  token: string,
  id: number,
  provider: MailboxProvider,
  kind: 'work' | 'personal' = 'work',
) =>
  call<{ authUrl: string }>(
    token,
    `/${id}/mailbox/auth-url?provider=${provider}&kind=${kind}`,
  )

export const disconnectMailbox = (token: string, id: number) =>
  call<{ disconnected: boolean }>(token, `/${id}/mailbox`, json('DELETE'))

export const submitRegistration = (token: string, id: number, body: SubmitBody) =>
  call<{ id: number; supportNumber: string | null }>(token, `/${id}/submit`, json('POST', body))
