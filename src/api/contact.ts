export type ContactValues = {
  firstName: string
  lastName: string
  email: string
  phone: string
  company: string
  title: string
  message: string
  /** Honeypot — rendered off-screen, so only a bot fills it in. */
  website: string
}

const FALLBACK = 'Oops! Something went wrong while submitting the form.'

/**
 * `POST /api/contact` on the customer server, which emails office@cygfinance.com.
 * Throws an Error whose message is safe to show the visitor: the server's own wording
 * for a 429/503, the first validation message for a 400, otherwise a generic line.
 */
export async function submitContact(values: ContactValues): Promise<void> {
  let res: Response
  try {
    res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
  } catch {
    throw new Error(FALLBACK)
  }
  if (res.ok) return

  const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null
  const message = Array.isArray(body?.message) ? body.message[0] : body?.message
  throw new Error(res.status < 500 || res.status === 503 ? (message ?? FALLBACK) : FALLBACK)
}
