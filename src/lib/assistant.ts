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
    case 'VOICE':
      return 'Phone'
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
export function optimisticMessage(text: string, now = new Date(), files: string[] = []): AssistantMessage {
  return {
    id: -now.getTime(),
    role: 'USER',
    channel: 'BOT',
    text: text || fileLabel(files.length),
    warning: null,
    actions: null,
    createdAt: now.toISOString(),
    files: files.map((filename, i) => ({ id: -(i + 1), filename, role: 'SENT', live: true })),
  }
}

/** "[sent a file]" — the server's placeholder for a message with files and no words. */
export function fileLabel(n: number): string {
  return n === 1 ? '[sent a file]' : `[sent ${n} files]`
}

/** True for that placeholder (the bubble then shows only the file chips). */
export const isFileLabel = (text: string) => /^\[sent (a file|\d+ files)\]$/.test(text)

/** Splits text into plain parts and http(s) links, so a link the AI sends can be clicked. */
export function linkParts(text: string): Array<{ text: string; href?: string }> {
  const out: Array<{ text: string; href?: string }> = []
  const re = /https?:\/\/[^\s<>"')\]]+/g
  let last = 0
  for (const m of text.matchAll(re)) {
    // A sentence's final period is not part of the link.
    const href = m[0].replace(/[.,;:!?]+$/, '')
    const at = m.index ?? 0
    if (at > last) out.push({ text: text.slice(last, at) })
    out.push({ text: href, href })
    last = at + href.length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}
