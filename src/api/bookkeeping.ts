import { errorFrom, fetchWithAuth, handleUnauthorized } from './client'

export type StatementStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED' | 'NEEDS_REVIEW'

export type Statement = {
  id: number
  filename: string
  sizeBytes: number
  status: StatementStatus
  error: string | null
  accountName: string | null
  bankName: string | null
  /** "Chase 4362 · Sep 2026" — the same label every ledger row of it shows. */
  label: string
  periodStart: string | null
  periodEnd: string | null
  transactionCount: number
  createdAt: string
  processedAt: string | null
}

export type LedgerTransaction = {
  id: number
  statementId: number
  pendingDate: string | null
  postingDate: string | null
  description: string
  amount: number
  offsetAccount: string
  debitAccount: string
  creditAccount: string
  /** The statement it came from, e.g. "Chase 4362 · Sep 2026". */
  statementLabel: string
}

export type ExportFormat = 'xlsx' | 'pdf'

/** Server-side ceilings — mirrored so the picker can refuse before uploading. */
export const MAX_STATEMENT_BYTES = 50 * 1024 * 1024
/** Files per request. The client sends batches, so a customer can upload any number. */
export const UPLOAD_BATCH = 10

export function isBusy(s: Statement): boolean {
  return s.status === 'PENDING' || s.status === 'PROCESSING'
}

export async function fetchStatements(token: string): Promise<Statement[]> {
  const res = await fetchWithAuth(token, '/api/bookkeeping/statements')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function fetchTransactions(token: string): Promise<LedgerTransaction[]> {
  const res = await fetchWithAuth(token, '/api/bookkeeping/transactions')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/**
 * One batch of PDFs. XHR rather than fetch so the upload reports progress — a batch of
 * scanned statements can be tens of megabytes.
 */
export function uploadStatements(
  token: string,
  files: File[],
  onProgress: (fraction: number) => void,
): Promise<Statement[]> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f, f.name))
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/bookkeeping/statements')
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      if (xhr.status === 401) {
        handleUnauthorized()
        return reject(new Error('Please log in again'))
      }
      let body: unknown = null
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(body as Statement[])
      const message = (body as { message?: string | string[] } | null)?.message
      reject(
        new Error(
          xhr.status === 413
            ? 'These files are too large to upload at once.'
            : (Array.isArray(message) ? message[0] : message) ?? 'The upload failed. Please try again.',
        ),
      )
    }
    xhr.onerror = () => reject(new Error('The upload failed — check your connection and try again.'))
    xhr.send(form)
  })
}

export async function deleteStatement(token: string, id: number): Promise<void> {
  const res = await fetchWithAuth(token, `/api/bookkeeping/statements/${id}`, { method: 'DELETE' })
  if (!res.ok) throw await errorFrom(res)
}

export async function retryStatement(token: string, id: number): Promise<Statement> {
  const res = await fetchWithAuth(token, `/api/bookkeeping/statements/${id}/retry`, {
    method: 'POST',
  })
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** Fetches a protected file and hands it to the browser as a download. */
async function saveBlob(res: Response, fallbackName: string): Promise<void> {
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** The whole ledger — every statement combined — as Excel or PDF. */
export async function downloadLedger(token: string, format: ExportFormat): Promise<void> {
  const res = await fetchWithAuth(token, `/api/bookkeeping/export?format=${format}`)
  if (!res.ok) throw await errorFrom(res)
  await saveBlob(res, `ledger.${format}`)
}

/** Opens the original uploaded PDF in a new tab (the route needs the Bearer token, so no plain link). */
export async function openOriginal(token: string, id: number): Promise<void> {
  // Open the tab synchronously, inside the click, or popup blockers eat it.
  const tab = window.open('', '_blank')
  const res = await fetchWithAuth(token, `/api/bookkeeping/statements/${id}/file`)
  if (!res.ok) {
    tab?.close()
    throw await errorFrom(res)
  }
  const url = URL.createObjectURL(await res.blob())
  if (tab) tab.location.href = url
  else window.location.href = url
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** React Query keys — one place, so every invalidation hits what the views read. */
export const STATEMENTS_KEY = ['bookkeeping', 'statements'] as const
export const TRANSACTIONS_KEY = ['bookkeeping', 'transactions'] as const
