import { bookFetch, type BookAuth } from './bookkeeping'
import { errorFrom } from './client'

/** One chat per channel on the Communication tab (step12). UPLOADS = files added on the site. */
export type CommChannel = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'BOT' | 'UPLOADS'

export type ChannelSummary = {
  channel: CommChannel
  lastAt: string | null
  preview: string | null
  count: number
}

export type CommFile = {
  /** attachment = a receipt / cheque / voice note / text; statement = a bank statement. */
  type: 'attachment' | 'statement'
  id: number
  filename: string
  mimeType: string | null
  /** The attachment / statement status; REMOVED = deleted (or refiled) since it was sent. */
  status: string
}

export type CommItem = {
  key: string
  at: string
  /** customer = they sent it; cyg = we (the assistant) answered. */
  side: 'customer' | 'cyg'
  kind: 'message' | 'upload'
  text: string | null
  files: CommFile[]
  warning?: string | null
}

export type CommPage = { items: CommItem[]; nextBefore: string | null }

export const COMMUNICATIONS_KEY = ['bookkeeping', 'communications'] as const

export async function fetchChannels(auth: BookAuth): Promise<ChannelSummary[]> {
  const res = await bookFetch(auth, '/api/bookkeeping/communications')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function fetchChannelPage(auth: BookAuth, channel: CommChannel, before?: string): Promise<CommPage> {
  const q = before ? `?before=${encodeURIComponent(before)}` : ''
  const res = await bookFetch(auth, `/api/bookkeeping/communications/${channel}${q}`)
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** Opens a sent file in a new tab (the routes need the Bearer token, so no plain link). */
export async function openCommFile(auth: BookAuth, file: CommFile): Promise<void> {
  // Open the tab synchronously, inside the click, or popup blockers eat it.
  const tab = window.open('', '_blank')
  const path = file.type === 'statement' ? 'statements' : 'attachments'
  const res = await bookFetch(auth, `/api/bookkeeping/${path}/${file.id}/file`)
  if (!res.ok) {
    tab?.close()
    throw await errorFrom(res)
  }
  const url = URL.createObjectURL(await res.blob())
  if (tab) tab.location.href = url
  else window.location.href = url
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
