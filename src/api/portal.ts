import { errorFrom, fetchWithAuth } from './client'
import { INTERNAL_API } from './registrations'

/**
 * The read-only Communications + Links view of a customer's business. Served by the
 * INTERNAL API (where the mailbox, phone and WhatsApp logic live), like the registration
 * wizard. Every data call carries two tokens: the customer's login (Bearer) and the
 * unlock token from the emailed code (`X-Portal-Token`).
 */
const base = `${INTERNAL_API}/customer-portal`

/** Thrown on the server's 403 `portal_locked`: the gate should ask for a code again. */
export class PortalLockedError extends Error {
  constructor() {
    super('Enter the code we emailed you to view this.')
  }
}

async function call<T>(
  token: string,
  path: string,
  unlock: string | null,
  init: RequestInit = {},
): Promise<T> {
  let res: Response
  try {
    res = await fetchWithAuth(token, `${base}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        ...(unlock ? { 'X-Portal-Token': unlock } : {}),
      },
    })
  } catch {
    throw new Error('Could not reach the server. Please check your connection and try again.')
  }
  if (res.status === 403) {
    const body = (await res.clone().json().catch(() => null)) as { code?: string } | null
    if (body?.code === 'portal_locked') throw new PortalLockedError()
  }
  if (!res.ok) throw await errorFrom(res)
  return (await res.json()) as T
}

const post = (body?: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  ...(body !== undefined && { body: JSON.stringify(body) }),
})

const qs = (params: Record<string, string | number | undefined | null>) => {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type PortalCompany = { id: number; businessName: string }

export type PortalOverview = {
  businessName: string
  mailbox: { provider: 'GOOGLE' | 'MICROSOFT'; emailAddress: string } | null
  supportNumber: string | null
  whatsappNumber: string | null
}

export type PortalLink = {
  id: number
  label: string
  url: string | null
  username: string | null
  password: string | null
  note: string | null
}

export type PortalEmail = {
  id: string
  threadId: string
  subject: string
  from: string
  to: string
  date: string
  snippet: string
  isRead: boolean
  isCompleted: boolean
  hasAttachments: boolean
}

export type PortalEmailList = {
  connected: boolean
  needsReconnect?: boolean
  messages: PortalEmail[]
  nextPageToken: string | null
}

export type PortalEmailAttachment = {
  filename: string
  mimeType: string
  size: number
  attachmentId: string
  contentId: string | null
  isInline: boolean
}

export type PortalEmailMessage = {
  id: string
  subject: string
  from: string
  to: string
  cc: string
  date: string
  bodyHtml: string | null
  bodyText: string | null
  attachments: PortalEmailAttachment[]
}

export type PortalChat = {
  id: string
  spaceId: string
  spaceName: string
  sender: string
  text: string
  createTime: string
  isRead: boolean
  isCompleted: boolean
  hasAttachments: boolean
}

export type PortalChatList = {
  connected: boolean
  chatStatus: string
  messages: PortalChat[]
  nextCursor: string | null
  hasMore: boolean
}

export type PortalChatAttachment = {
  name: string
  contentType: string
  resourceName: string | null
  downloadUri: string | null
}

export type PortalChatThread = {
  spaceName: string
  nextPageToken: string | null
  messages: {
    id: string
    sender: string
    text: string
    createTime: string
    isOwn: boolean
    attachments: PortalChatAttachment[]
  }[]
}

type PhoneBase = {
  id: string
  sid: string
  direction: 'inbound' | 'outbound'
  counterparty: string
  counterpartyName: string | null
  at: string
  isRead: boolean
  isCompleted: boolean
}

export type PortalCall = PhoneBase & {
  kind: 'call'
  outcome: 'answered' | 'missed' | 'failed' | 'in-progress'
  durationSec: number
  hasRecording: boolean
  hasVoicemail: boolean
}

export type PortalSms = PhoneBase & { kind: 'sms'; body: string; numMedia: number }

export type PortalPhoneItem = PortalCall | PortalSms

export type PortalPhoneTimeline = {
  hasNumber: boolean
  supportNumber: string | null
  items: PortalPhoneItem[]
  nextCursor: string | null
  hasMore: boolean
}

export type PortalSmsMedia = { sid: string; contentType: string; token: string }

export type PortalSmsThread = {
  peer: string
  supportNumber: string | null
  messages: {
    id: string
    sid: string
    direction: 'inbound' | 'outbound'
    at: string
    body: string
    media: PortalSmsMedia[]
  }[]
}

export type PortalRecording = {
  sid: string
  durationSec: number
  createdAt: string | null
  token: string
}

export type PortalWhatsApp = {
  id: string
  messageId: number
  direction: 'inbound' | 'outbound'
  peer: string
  peerName: string | null
  type: string
  body: string | null
  isVoice: boolean
  durationSec: number | null
  transcript: string | null
  hasMedia: boolean
  mediaStatus: string | null
  mimeType: string | null
  filename: string | null
  at: string
  isRead: boolean
  isCompleted: boolean
}

export type PortalWhatsAppTimeline = {
  connected: boolean
  items: PortalWhatsApp[]
  nextCursor: number | null
  hasMore: boolean
}

export type PortalWhatsAppThread = {
  peer: string
  peerName: string | null
  messages: PortalWhatsApp[]
}

// ─── Code ────────────────────────────────────────────────────────────────────

export const sendPortalCode = (token: string) =>
  call<{ sentTo: string; expiresInSec: number; resendInSec: number }>(token, '/code', null, post())

export const verifyPortalCode = (token: string, code: string) =>
  call<{ unlockToken: string }>(token, '/code/verify', null, post({ code }))

// ─── Reads ───────────────────────────────────────────────────────────────────

export const listPortalCompanies = (token: string) =>
  call<PortalCompany[]>(token, '/companies', null)

const co = (id: number) => `/companies/${id}`

export const getPortalOverview = (token: string, unlock: string, id: number) =>
  call<PortalOverview>(token, co(id), unlock)

export const getPortalLinks = (token: string, unlock: string, id: number) =>
  call<PortalLink[]>(token, `${co(id)}/links`, unlock)

export const getPortalEmails = (
  token: string,
  unlock: string,
  id: number,
  folder: 'INBOX' | 'SENT',
  pageToken?: string,
) => call<PortalEmailList>(token, `${co(id)}/emails${qs({ folder, pageToken })}`, unlock)

export const getPortalEmailThread = (token: string, unlock: string, id: number, threadId: string) =>
  call<{ messages: PortalEmailMessage[] }>(token, `${co(id)}/email-thread${qs({ threadId })}`, unlock)

export const getPortalChats = (token: string, unlock: string, id: number, cursor?: string) =>
  call<PortalChatList>(token, `${co(id)}/chats${qs({ cursor })}`, unlock)

export const getPortalChatThread = (token: string, unlock: string, id: number, spaceId: string) =>
  call<PortalChatThread>(token, `${co(id)}/chat-thread${qs({ spaceId })}`, unlock)

export const getPortalPhoneTimeline = (token: string, unlock: string, id: number, before?: string) =>
  call<PortalPhoneTimeline>(token, `${co(id)}/phone/timeline${qs({ before })}`, unlock)

export const getPortalSmsThread = (token: string, unlock: string, id: number, peer: string) =>
  call<PortalSmsThread>(token, `${co(id)}/phone/sms-thread${qs({ peer })}`, unlock)

export const getPortalCallRecordings = (token: string, unlock: string, id: number, sid: string) =>
  call<{ recordings: PortalRecording[] }>(
    token,
    `${co(id)}/phone/calls/${encodeURIComponent(sid)}/recordings`,
    unlock,
  )

export const getPortalWhatsAppTimeline = (token: string, unlock: string, id: number, cursor?: number) =>
  call<PortalWhatsAppTimeline>(token, `${co(id)}/whatsapp/timeline${qs({ cursor })}`, unlock)

export const getPortalWhatsAppThread = (token: string, unlock: string, id: number, peer: string) =>
  call<PortalWhatsAppThread>(token, `${co(id)}/whatsapp/thread${qs({ peer })}`, unlock)

// ─── Byte URLs (<img>, <audio>, downloads — no headers, so the unlock rides as ?pt=) ──

export function emailAttachmentUrl(
  unlock: string,
  companyId: number,
  messageId: string,
  att: PortalEmailAttachment,
  download = false,
): string {
  return `${base}/media/companies/${companyId}/email-attachment${qs({
    pt: unlock,
    messageId,
    attachmentId: att.attachmentId,
    mimeType: att.mimeType,
    filename: att.filename,
    size: att.size,
    disposition: download ? 'attachment' : 'inline',
  })}`
}

export function chatAttachmentUrl(
  unlock: string,
  companyId: number,
  att: PortalChatAttachment,
): string {
  return `${base}/media/companies/${companyId}/chat-attachment${qs({
    pt: unlock,
    resourceName: att.resourceName,
    mimeType: att.contentType,
    filename: att.name,
  })}`
}

export function whatsappMediaUrl(
  unlock: string,
  companyId: number,
  messageId: number,
  opts: { playback?: boolean; download?: boolean } = {},
): string {
  return `${base}/media/companies/${companyId}/whatsapp/${messageId}${qs({
    pt: unlock,
    variant: opts.playback ? 'playback' : undefined,
    download: opts.download ? 1 : undefined,
  })}`
}

/** Recordings and MMS files keep the staff app's own per-file tokens and routes. */
export const recordingUrl = (rec: PortalRecording) =>
  `${INTERNAL_API}/phone/recordings/${encodeURIComponent(rec.sid)}?token=${encodeURIComponent(rec.token)}`

export const smsMediaUrl = (media: PortalSmsMedia, messageSid: string) =>
  `${INTERNAL_API}/phone/sms-media/${encodeURIComponent(messageSid)}/${encodeURIComponent(media.sid)}?token=${encodeURIComponent(media.token)}`
