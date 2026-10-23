/**
 * Plaid Link, loaded from Plaid's own CDN (their required way to load it — no npm package).
 * `openPlaidLink` resolves with the `public_token` on success, null when the customer
 * closes it.
 *
 * Banks that sign in on their own site (OAuth) leave the page and come back to
 * `/plaid/oauth`; the link token and the book are kept in sessionStorage so that page can
 * resume the same Link session (`receivedRedirectUri`).
 */
const SCRIPT = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
const PENDING_KEY = 'plaid-link-pending'

type PlaidHandler = { open: () => void; exit: () => void; destroy: () => void }
type PlaidGlobal = {
  create: (config: {
    token: string
    receivedRedirectUri?: string
    onSuccess: (publicToken: string) => void
    onExit: (err: unknown) => void
  }) => PlaidHandler
}

declare global {
  interface Window {
    Plaid?: PlaidGlobal
  }
}

let loading: Promise<PlaidGlobal> | null = null

function loadPlaid(): Promise<PlaidGlobal> {
  if (window.Plaid) return Promise.resolve(window.Plaid)
  loading ??= new Promise((resolve, reject) => {
    const tag = document.createElement('script')
    tag.src = SCRIPT
    tag.async = true
    tag.onload = () => (window.Plaid ? resolve(window.Plaid) : reject(new Error('Plaid did not load')))
    tag.onerror = () => {
      loading = null
      reject(new Error('Could not load the bank connection window. Check your connection and try again.'))
    }
    document.head.appendChild(tag)
  })
  return loading
}

/** What `/plaid/oauth` needs to finish a Link session that left for the bank's site. */
export type PendingLink = {
  token: string
  companyId: number | null
  /** step12c: the bookkeeping company the bank is connected in. */
  bookId?: number | null
  itemId?: number
  returnTo: string
}

export function savePendingLink(p: PendingLink): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(p))
  } catch {
    // Private mode: an OAuth bank then has to be started again; the others never need it.
  }
}

export function readPendingLink(): PendingLink | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as PendingLink) : null
  } catch {
    return null
  }
}

export function clearPendingLink(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    // nothing to clear
  }
}

export async function openPlaidLink(token: string, receivedRedirectUri?: string): Promise<string | null> {
  const Plaid = await loadPlaid()
  return new Promise((resolve) => {
    const handler = Plaid.create({
      token,
      receivedRedirectUri,
      onSuccess: (publicToken) => {
        handler.destroy()
        resolve(publicToken)
      },
      onExit: () => {
        handler.destroy()
        resolve(null)
      },
    })
    handler.open()
  })
}
