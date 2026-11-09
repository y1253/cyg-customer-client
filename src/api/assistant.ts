import { bookFetch, type BookAuth } from './bookkeeping'
import { errorFrom, fetchWithAuth } from './client'

/** Where a message came from: the website chat, a text, or WhatsApp to a receipt number. */
export type AssistantChannel = 'BOT' | 'SMS' | 'WHATSAPP' | 'EMAIL' | 'VOICE'

/** One thing the agent did while answering (its audit trail). */
export type AssistantAction = { tool: string; ok: boolean; summary: string }

/** A file a message came with, is about, or changed (step11b) — kept after it is deleted. */
export type AssistantMessageFile = {
  id: number
  filename: string
  /** SENT = came with the message, ABOUT = the chat is about it, ACTION = the AI changed it. */
  role: 'SENT' | 'ABOUT' | 'ACTION' | string
  /** False = deleted since. */
  live: boolean
}

export type AssistantMessage = {
  id: number
  role: 'USER' | 'ASSISTANT'
  channel: AssistantChannel
  text: string
  /** Set when the AI did what was asked without understanding why — double-check it. */
  warning: string | null
  actions: AssistantAction[] | null
  createdAt: string
  files?: AssistantMessageFile[]
}

/** `POST /api/assistant/chat` and `POST …/attachments/:id/chat`. */
export type AssistantReply = {
  conversationId: number
  message: AssistantMessage
  reply: AssistantMessage
}

export type AssistantConversation = {
  id: number
  channel: AssistantChannel
  title: string | null
  peer: string | null
  attachmentId: number | null
  /** step8: the statement this thread is about (Bank feeds → Ask AI). */
  statementId?: number | null
  lastMessageAt: string
  preview: string | null
}

export type AssistantRule = { id: number; text: string; topic: string; createdAt: string }

export type AttachmentChat = { conversationId: number | null; messages: AssistantMessage[] }

export const ASSISTANT_CONFIG_KEY = ['assistant-config'] as const
export const CONVERSATIONS_KEY = ['assistant-conversations'] as const
export const CONVERSATION_KEY = ['assistant-conversation'] as const
export const ASSISTANT_RULES_KEY = ['assistant-rules'] as const
export const ATTACHMENT_CHAT_KEY = ['attachment-chat'] as const
export const STATEMENT_CHAT_KEY = ['statement-chat'] as const
export const ATTACHMENT_MESSAGES_KEY = ['attachment-messages'] as const

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

/** Whether the firm turned the assistant on (`AI_ASSISTANT`). Not book-scoped. */
export async function fetchAssistantConfig(token: string): Promise<{ enabled: boolean }> {
  const res = await fetchWithAuth(token, '/api/assistant/config')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function sendAssistantMessage(
  auth: BookAuth,
  body: { conversationId?: number; text: string; attachmentIds?: number[] },
): Promise<AssistantReply> {
  const res = await bookFetch(auth, '/api/assistant/chat', json('POST', body))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function fetchConversations(auth: BookAuth): Promise<AssistantConversation[]> {
  const res = await bookFetch(auth, '/api/assistant/conversations')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function fetchConversationMessages(auth: BookAuth, id: number): Promise<AssistantMessage[]> {
  const res = await bookFetch(auth, `/api/assistant/conversations/${id}/messages`)
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function fetchAssistantRules(auth: BookAuth): Promise<AssistantRule[]> {
  const res = await bookFetch(auth, '/api/assistant/rules')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function deleteAssistantRule(auth: BookAuth, id: number): Promise<void> {
  const res = await bookFetch(auth, `/api/assistant/rules/${id}`, { method: 'DELETE' })
  if (!res.ok) throw await errorFrom(res)
}

export async function fetchAttachmentChat(auth: BookAuth, attachmentId: number): Promise<AttachmentChat> {
  const res = await bookFetch(auth, `/api/bookkeeping/attachments/${attachmentId}/chat`)
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function sendAttachmentChat(auth: BookAuth, attachmentId: number, text: string): Promise<AssistantReply> {
  const res = await bookFetch(auth, `/api/bookkeeping/attachments/${attachmentId}/chat`, json('POST', { text }))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** step8: the "Ask AI" thread about one statement we could not read (same shape as a file's). */
export async function fetchStatementChat(auth: BookAuth, statementId: number): Promise<AttachmentChat> {
  const res = await bookFetch(auth, `/api/bookkeeping/statements/${statementId}/chat`)
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function sendStatementChat(auth: BookAuth, statementId: number, text: string): Promise<AssistantReply> {
  const res = await bookFetch(auth, `/api/bookkeeping/statements/${statementId}/chat`, json('POST', { text }))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** step11b: every AI message linked to one file, on any channel (kept after it is deleted). */
export async function fetchAttachmentMessages(auth: BookAuth, attachmentId: number): Promise<AssistantMessage[]> {
  const res = await bookFetch(auth, `/api/bookkeeping/attachments/${attachmentId}/messages`)
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export const CHANGES_KEY = ['assistant-changes'] as const

/**
 * step12h: this customer's change counter — moves when the AI (any channel) or a statement /
 * receipt / bank feed changed their books. Not book-scoped.
 */
export async function fetchChanges(token: string): Promise<{ version: string }> {
  const res = await fetchWithAuth(token, '/api/assistant/changes')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/**
 * step8: the customer's own voice, as text (the mic button on every chat). An empty `text`
 * means nothing was heard.
 */
export async function transcribeDictation(
  auth: BookAuth,
  recording: Blob,
  filename: string,
): Promise<{ text: string }> {
  const form = new FormData()
  form.append('file', recording, filename)
  // No Content-Type header: the browser sets the multipart boundary itself.
  const res = await bookFetch(auth, '/api/assistant/transcribe', { method: 'POST', body: form })
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export const CALL_ME_KEY = ['call-me'] as const

/** step2: can the AI phone the customer now (a phone on the account, calls set up)? */
export async function fetchCallMe(auth: BookAuth): Promise<{ available: boolean }> {
  const res = await bookFetch(auth, '/api/bookkeeping/call-me')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/**
 * step2: "Call me" in a statement's / attachment's chat — the AI phones the customer about
 * it; what is said is added to that chat after the call. `ok: false` = not placed (`message` says why).
 */
export async function requestCallMe(
  auth: BookAuth,
  /** step2 (2026-11-09): `{}` = the chat bubble's general "Call me" from the website. */
  target: { statementId: number } | { attachmentId: number } | Record<string, never>,
): Promise<{ ok: boolean; message: string }> {
  const res = await bookFetch(auth, '/api/bookkeeping/call-me', json('POST', target))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/**
 * step2 (2026-11-09): "Text me a welcome" on the chat bubble — our AI number texts the
 * customer's own phone so they have it saved. `ok: false` = not sent (`message` says why).
 */
export async function requestWelcomeText(auth: BookAuth): Promise<{ ok: boolean; message: string }> {
  const res = await bookFetch(auth, '/api/bookkeeping/welcome-text', { method: 'POST' })
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}
