import { bookFetch, bookUrl, type AttachmentKind, type BookAuth } from './bookkeeping'
import { errorFrom, handleUnauthorized } from './client'

/**
 * PENDING/PROCESSING = being read; UNMATCHED = read, the customer picks the transaction;
 * DOCUMENT (step11b) = read and not a payment (a letter, a request, a screenshot) — kept.
 */
/**
 * step2 (2026-11-11): RELATED = on a transaction · DOCUMENT = not a transaction (a contract, a
 * letter) · ERROR = a payment we could not match, could not read, or that has no name yet ·
 * READING = still being read (not counted).
 */
export type FileBucket = 'RELATED' | 'DOCUMENT' | 'ERROR' | 'READING'

export type AttachmentStatus = 'PENDING' | 'PROCESSING' | 'MATCHED' | 'UNMATCHED' | 'FAILED' | 'DOCUMENT'

/** step11b: what the AI decided a file IS before matching it. */
export type DocumentType =
  | 'RECEIPT'
  | 'INVOICE'
  | 'CHECK'
  | 'DEPOSIT_SLIP'
  | 'PAYMENT_NOTE'
  | 'BANK_STATEMENT'
  | 'DOCUMENT'

/** What the AI read off a receipt, cheque or voice note. Money is positive. */
export type AttachmentReading = {
  /** step11b; absent on files read before it. */
  documentType?: DocumentType
  /** step11b: one line saying what it is. */
  summary?: string | null
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
  /** A cheque: the category assumed from its payee and memo (used when the payee is a new name). */
  category?: string | null
  transcript?: string
}

export type Attachment = {
  id: number
  /** step8: the statement a cheque image was cut out of — its "from statement" badge opens it. */
  fromStatementId: number | null
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
  /**
   * UPLOAD (this site), CHAT (added in the AI chat), SMS / WHATSAPP (sent to one of our
   * receipt numbers), EMAIL (our inbox) or STATEMENT (a cheque image cut out of a statement).
   */
  source: 'UPLOAD' | 'CHAT' | 'SMS' | 'WHATSAPP' | 'EMAIL' | 'STATEMENT'
  /** SMS / WHATSAPP only: who sent it and what they wrote. */
  sourcePhone: string | null
  message: string | null
  /**
   * The bank / card account it is filed under on the Attachments tab: the account of the
   * statement its transaction came from. null = not matched yet ("Not filed yet").
   */
  folder: string | null
  /** step11b: AI messages linked to this file (absent from an older server). */
  messageCount?: number
  /**
   * step9: cut out of a bigger image that held several documents (two cheques side by side)
   * — `attachmentObjectUrl(…, true)` gives the whole image.
   */
  cropped?: boolean
  /**
   * step2 (2026-11-13): the picture was cleaned up before it was stored (upright, readable
   * size, contrast, sharpen — never cropped) — `attachmentObjectUrl(…, 'raw')` gives it as sent.
   */
  hasOriginal?: boolean
  /** step9: the other documents read off the same image (only on a single fetch). */
  siblings?: number[]
  /**
   * step2 (2026-11-11): the Names-tab name it is filed under (null = Unsorted) and which of
   * the three counts it is in. Decided by the server (`attachment-name.util.ts`).
   */
  name: string | null
  bucket: FileBucket
  /** step2: the customer's subfolder inside that name's folder; null = the top. */
  folderId: number | null
  /** step2: the customer's own name for the file; null = not renamed. */
  displayName: string | null
  /** step2: came by email — "View full email". */
  hasEmail: boolean
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
  '.pdf,.jpg,.jpeg,.png,.webp,.gif,.mp3,.m4a,.mp4,.wav,.webm,.ogg,.oga,.xlsx,.csv,application/pdf,image/jpeg,image/png,image/webp,image/gif,audio/*,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
/** step2 (2026-11-08): spreadsheets (.xlsx, .csv) too — the server reads them as text. */
export const isAcceptedAttachment = (f: File) => /\.(pdf|jpe?g|png|webp|gif|mp3|m4a|mp4|wav|webm|ogg|oga|xlsx|csv)$/i.test(f.name)
/** A spreadsheet: no preview in the browser, only a download. */
export const isSpreadsheetMime = (mime: string) =>
  mime.startsWith('text/csv') || mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const isBusyAttachment = (a: Attachment) => a.status === 'PENDING' || a.status === 'PROCESSING'

/** `GET /api/bookkeeping/intake` — the numbers to text receipts to, and how this customer is matched. */
export type Intake = {
  /** E.164; empty when the firm has connected none. */
  numbers: string[]
  /** The ones that also take WhatsApp (they still take texts too). */
  whatsapp: string[]
  /** The customer's phone as texts are matched (E.164); null = none usable. */
  phone: string | null
  /** A phone is saved but cannot be read as a number. */
  phoneSaved: boolean
  /** The firm inbox customers can email receipts and questions to (step12); null = none. Absent from an older server. */
  email?: string | null
  /** step12c: calling a receipt number reaches the AI assistant right now. Absent from an older server. */
  voice?: boolean
}

export async function fetchIntake(auth: BookAuth): Promise<Intake> {
  const res = await bookFetch(auth, '/api/bookkeeping/intake')
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
  auth: BookAuth,
  files: File[],
  transactionId: number | null,
  onProgress: (fraction: number) => void,
  /** step2: uploaded inside a name's folder (and subfolder) on the Names tab — it stays there. */
  place: FilePlace = {},
): Promise<Attachment[]> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    if (transactionId != null) form.append('transactionId', String(transactionId))
    if (place.name) form.append('name', place.name)
    if (place.folderId != null) form.append('folderId', String(place.folderId))
    files.forEach((f) => form.append('files', f, f.name))
    const xhr = new XMLHttpRequest()
    xhr.open('POST', bookUrl(auth, '/api/bookkeeping/attachments'))
    xhr.setRequestHeader('Authorization', `Bearer ${auth.token}`)
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

export async function fetchAttachments(auth: BookAuth): Promise<Attachment[]> {
  const res = await bookFetch(auth, '/api/bookkeeping/attachments')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** Attach to a transaction (its items become splits when it has none), or `null` to detach. */
export async function setAttachmentTransaction(
  auth: BookAuth,
  id: number,
  transactionId: number | null,
): Promise<Attachment> {
  const res = await bookFetch(auth, `/api/bookkeeping/attachments/${id}`, json('PATCH', { transactionId }))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** Replace the transaction's splits with the receipt's items. */
export async function applyAttachmentItems(auth: BookAuth, id: number): Promise<Attachment> {
  const res = await bookFetch(auth, `/api/bookkeeping/attachments/${id}/apply-items`, json('POST'))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function retryAttachment(auth: BookAuth, id: number): Promise<Attachment> {
  const res = await bookFetch(auth, `/api/bookkeeping/attachments/${id}/retry`, json('POST'))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** A file "Read all again" takes: it failed, or was read but matched nothing (server: `retryAll`). */
export const rereadableFile = (a: Pick<Attachment, 'status'>): boolean =>
  a.status === 'FAILED' || a.status === 'UNMATCHED'

/** "Read all again": every FAILED / UNMATCHED file of `ids` back to reading. */
export async function retryAttachments(auth: BookAuth, ids: number[]): Promise<{ queued: number }> {
  const res = await bookFetch(auth, '/api/bookkeeping/attachments/retry-all', json('POST', { ids }))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function deleteAttachment(auth: BookAuth, id: number): Promise<void> {
  const res = await bookFetch(auth, `/api/bookkeeping/attachments/${id}`, { method: 'DELETE' })
  if (!res.ok) throw await errorFrom(res)
}

/** The file as an object URL (the route needs the Bearer token, so no plain link). Revoke it when done. */
export async function attachmentObjectUrl(auth: BookAuth, id: number, original: boolean | 'raw' = false): Promise<string> {
  // step9: `original` = the whole image a cropped file was cut out of; step2 (2026-11-13):
  // 'raw' = the picture exactly as it arrived, before the clean-up pass.
  const query = original === 'raw' ? '?raw=1' : original ? '?original=1' : ''
  const res = await bookFetch(auth, `/api/bookkeeping/attachments/${id}/file${query}`)
  if (!res.ok) throw await errorFrom(res)
  return URL.createObjectURL(await res.blob())
}

// ── step2 (2026-11-11): files live in the Names tab ─────────────────────────

/** Where a file goes: a name's folder (none = Unsorted, the AI files it) and a subfolder. */
export type FilePlace = { name?: string | null; folderId?: number | null }

/** A customer's subfolder inside a name's folder. `nameKey` '' = Unsorted. */
export type NameFolder = { id: number; nameKey: string; parentId: number | null; title: string }

export const NAME_FOLDERS_KEY = ['bookkeeping', 'name-folders'] as const

/** Move a file to another name ('' = back to what was read), into a subfolder, or rename it. */
export async function placeAttachment(
  auth: BookAuth,
  id: number,
  body: { name?: string | null; folderId?: number | null; displayName?: string | null },
): Promise<Attachment> {
  const res = await bookFetch(auth, `/api/bookkeeping/attachments/${id}/place`, json('PATCH', body))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function fetchNameFolders(auth: BookAuth): Promise<NameFolder[]> {
  const res = await bookFetch(auth, '/api/bookkeeping/name-folders')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function createNameFolder(
  auth: BookAuth,
  body: { name: string | null; parentId: number | null; title: string },
): Promise<NameFolder[]> {
  const res = await bookFetch(auth, '/api/bookkeeping/name-folders', json('POST', body))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function renameNameFolder(auth: BookAuth, id: number, title: string): Promise<NameFolder[]> {
  const res = await bookFetch(auth, `/api/bookkeeping/name-folders/${id}`, json('PATCH', { title }))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** Its files and subfolders move up a level. */
export async function deleteNameFolder(auth: BookAuth, id: number): Promise<NameFolder[]> {
  const res = await bookFetch(auth, `/api/bookkeeping/name-folders/${id}`, { method: 'DELETE' })
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** A name added by hand — listed from now on, with or without transactions. */
export async function addName(auth: BookAuth, name: string, group: string | null): Promise<{ name: string }> {
  const res = await bookFetch(auth, '/api/bookkeeping/names', json('POST', { name, group }))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** The email a file came in. `partial` = only its words were kept (it came before step2). */
export type AttachmentEmail = {
  from: string | null
  to: string | null
  subject: string | null
  receivedAt: string | null
  text: string | null
  html: string | null
  partial: boolean
  files: Array<{ id: number; filename: string; mimeType: string }>
}

export async function fetchAttachmentEmail(auth: BookAuth, id: number): Promise<AttachmentEmail> {
  const res = await bookFetch(auth, `/api/bookkeeping/attachments/${id}/email`)
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** A 30-minute link a phone opens (by QR code) to send files into this book. */
export async function phoneUploadLink(
  auth: BookAuth,
  place: FilePlace = {},
): Promise<{ url: string; expiresInMinutes: number }> {
  const res = await bookFetch(auth, '/api/bookkeeping/phone-upload-link', json('POST', place))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** "Send a welcome email": our inbox emails `to` how to send documents in. */
export async function sendWelcomeEmail(auth: BookAuth, to: string): Promise<{ ok: boolean; message: string }> {
  const res = await bookFetch(auth, '/api/bookkeeping/welcome-email', json('POST', { to }))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** The QR page (no sign-in): which book the link sends to. */
export async function fetchPhoneUpload(token: string): Promise<{ bookName: string; name: string | null }> {
  const res = await fetch(`/api/phone-upload/${encodeURIComponent(token)}`)
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** The QR page's upload — XHR for progress, like `uploadAttachments`, with no sign-in. */
export function phoneUpload(
  token: string,
  files: File[],
  onProgress: (fraction: number) => void,
): Promise<Array<{ id: number; filename: string }>> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f, f.name))
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/phone-upload/${encodeURIComponent(token)}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      let body: unknown = null
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(body as Array<{ id: number; filename: string }>)
      const message = (body as { message?: string | string[] } | null)?.message
      reject(new Error((Array.isArray(message) ? message[0] : message) ?? 'The upload failed. Please try again.'))
    }
    xhr.onerror = () => reject(new Error('The upload failed — check your connection and try again.'))
    xhr.send(form)
  })
}
