/** localStorage keys for the signed-in customer. */
export const TOKEN_KEY = 'customerToken'
export const CUSTOMER_KEY = 'customer'

/**
 * A 401 on an authenticated request means the token expired or the account is gone:
 * forget the session and send the visitor to the login page.
 */
export function handleUnauthorized(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(CUSTOMER_KEY)
  window.location.href = '/login'
}

/** `fetch` with the customer's Bearer token. */
export async function fetchWithAuth(
  token: string,
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) handleUnauthorized()
  return res
}

const FALLBACK = 'Something went wrong. Please try again.'

/** A failed API call: the message to show, plus the HTTP status and the body it came with. */
export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/**
 * The server's own message for a 4xx (the first one, for a validation array), or a
 * generic line — never a 5xx's internals. The status and the 4xx body ride along
 * (`ApiError`), so a caller can act on a structured answer such as a 409.
 */
export async function errorFrom(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as {
    message?: string | string[]
  } | null
  const message = Array.isArray(body?.message) ? body.message[0] : body?.message
  const shown = res.status < 500 || res.status === 503
  return new ApiError(shown ? (message ?? FALLBACK) : FALLBACK, res.status, shown ? body : null)
}

/** A network failure (offline, proxy) becomes the generic message rather than a TypeError. */
export async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch {
    throw new Error(FALLBACK)
  }
}
