import { bookFetch, type BookAuth } from './bookkeeping'
import { errorFrom, fetchWithAuth } from './client'

/** Where a message came from: the website chat, a text, or WhatsApp to a receipt number. */
export type AssistantChannel = 'BOT' | 'SMS' | 'WHATSAPP' | 'EMAIL'

/** One thing the agent did while answering (its audit trail). */
export type AssistantAction = { tool: string; ok: boolean; summary: string }

export type AssistantMessage = {
  id: number
  role: 'USER' | 'ASSISTANT'
  channel: AssistantChannel
  text: string
  /** Set when the AI did what was asked without understanding why — double-check it. */
  warning: string | null
  actions: AssistantAction[] | null
  createdAt: string
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
  body: { conversationId?: number; text: string },
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
