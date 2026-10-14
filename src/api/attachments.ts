import type { AttachmentKind } from './bookkeeping'
import { errorFrom, fetchWithAuth, handleUnauthorized } from './client'

/** PENDING/PROCESSING = being read; UNMATCHED = read, the customer picks the transaction. */
export type AttachmentStatus = 'PENDING' | 'PROCESSING' | 'MATCHED' | 'UNMATCHED' | 'FAILED'

/** What the AI read off a receipt, cheque or voice note. Money is positive. */
export type AttachmentReading = {
  kind: 'RECEIPT' | 'CHECK' | 'OTHER'
  vendor: string | null
  date: string | null
  subtotal: number | null
  tax: number | null
  total: number | null
  items: Array<{ name: string; amount: number }>
  checkNumber: string | null
  payee: string | null
  memo: string | null
  transcript?: string
}

export type Attachment = {
  id: number
  kind: AttachmentKind
  status: AttachmentStatus
  filename: string
  mimeType: string
  size: number
  createdAt: string
  reading: AttachmentReading | null
  total: number | null
  matchNote: string | null
  error: string | null
  /** UPLOAD (this site), SMS (texted to one of our numbers) or STATEMENT (a cheque image cut out of a statement). */
  source: 'UPLOAD' | 'SMS' | 'STATEMENT'
  /** SMS only: who sent it and what they wrote. */
  sourcePhone: string | null
  message: string | null
  transaction: {
    id: number
    name: string | null
    description: string
    amount: number
    date: string | null
    statementId: number
    statementLabel: string
    splitCount: number
  } | null
}

/** Mirrors the server's `MAX_ATTACHMENT_BYTES` and `ATTACHMENT_UPLOAD_OPTIONS`. */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024
export const ATTACHMENT_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.webp,.gif,.mp3,.m4a,.mp4,.wav,.webm,.ogg,.oga,application/pdf,image/jpeg,image/png,image/webp,image/gif,audio/*'
export const isAcceptedAttachment = (f: File) => /\.(pdf|jpe?g|png|webp|gif|mp3|m4a|mp4|wav|webm|ogg|oga)$/i.test(f.name)
export const isBusyAttachment = (a: Attachment) => a.status === 'PENDING' || a.status === 'PROCESSING'

/** `GET /api/bookkeeping/intake` — the numbers to text receipts to, and how this customer is matched. */
export type Intake = {
  /** E.164; empty when the firm has connected none. */
  numbers: string[]
  /** The customer's phone as texts are matched (E.164); null = none usable. */
  phone: string | null
  /** A phone is saved but cannot be read as a number. */
  phoneSaved: boolean
}

export async function fetchIntake(token: string): Promise<Intake> {
  const res = await fetchWithAuth(token, '/api/bookkeeping/intake')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
})

/**
 * Receipts, cheque photos and voice notes; `transactionId` adds them to that transaction.
 * XHR rather than fetch so the upload reports progress.
 */
export function uploadAttachments(
  token: string,
  files: File[],
  transactionId: number | null,
  onProgress: (fraction: number) => void,
): Promise<Attachment[]> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    if (transactionId != null) form.append('transactionId', String(transactionId))
    files.forEach((f) => form.append('files', f, f.name))
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/bookkeeping/attachments')
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
      if (xhr.status >= 200 && xhr.status < 300) return resolve(body as Attachment[])
      const message = (body as { message?: string | string[] } | null)?.message
      reject(
        new Error(
          xhr.status === 413
            ? 'These files are too large to upload at once.'
            : ((Array.isArray(message) ? message[0] : message) ?? 'The upload failed. Please try again.'),
        ),
      )
    }
    xhr.onerror = () => reject(new Error('The upload failed — check your connection and try again.'))
    xhr.send(form)
  })
}

export async function fetchAttachments(token: string): Promise<Attachment[]> {
  const res = await fetchWithAuth(token, '/api/bookkeeping/attachments')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** Attach to a transaction (its items become splits when it has none), or `null` to detach. */
export async function setAttachmentTransaction(
  token: string,
  id: number,
  transactionId: number | null,
): Promise<Attachment> {
  const res = await fetchWithAuth(token, `/api/bookkeeping/attachments/${id}`, json('PATCH', { transactionId }))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** Replace the transaction's splits with the receipt's items. */
export async function applyAttachmentItems(token: string, id: number): Promise<Attachment> {
  const res = await fetchWithAuth(token, `/api/bookkeeping/attachments/${id}/apply-items`, json('POST'))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function retryAttachment(token: string, id: number): Promise<Attachment> {
  const res = await fetchWithAuth(token, `/api/bookkeeping/attachments/${id}/retry`, json('POST'))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function deleteAttachment(token: string, id: number): Promise<void> {
  const res = await fetchWithAuth(token, `/api/bookkeeping/attachments/${id}`, { method: 'DELETE' })
  if (!res.ok) throw await errorFrom(res)
}

/** The file as an object URL (the route needs the Bearer token, so no plain link). Revoke it when done. */
export async function attachmentObjectUrl(token: string, id: number): Promise<string> {
  const res = await fetchWithAuth(token, `/api/bookkeeping/attachments/${id}/file`)
  if (!res.ok) throw await errorFrom(res)
  return URL.createObjectURL(await res.blob())
}
