import type { AssistantChannel, AssistantConversation, AssistantMessage } from '@/api/assistant'

/** The badge a message or thread carries: where it was written. */
export function channelLabel(channel: AssistantChannel): string {
  switch (channel) {
    case 'SMS':
      return 'Text'
    case 'WHATSAPP':
      return 'WhatsApp'
    case 'EMAIL':
      return 'Email'
    default:
      return 'Web'
  }
}

/** A conversation's name in the list: its title, else its channel and phone, else "Chat". */
export function conversationLabel(c: Pick<AssistantConversation, 'title' | 'channel' | 'peer' | 'attachmentId'>): string {
  if (c.title?.trim()) return c.title.trim()
  if (c.channel !== 'BOT') return `${channelLabel(c.channel)}${c.peer ? ` · ${c.peer}` : ''}`
  if (c.attachmentId) return 'About an attachment'
  return 'Chat'
}

/** True when an answer changed something, so the books on screen must be refetched. */
export function changedSomething(m: Pick<AssistantMessage, 'actions'>): boolean {
  return !!m.actions?.some((a) => a.ok)
}

/** What a pending user message looks like before the server answers (negative id). */
export function optimisticMessage(text: string, now = new Date()): AssistantMessage {
  return {
    id: -now.getTime(),
    role: 'USER',
    channel: 'BOT',
    text,
    warning: null,
    actions: null,
    createdAt: now.toISOString(),
  }
}
