import type { PortalCall, PortalChat, PortalEmail, PortalSms, PortalWhatsApp } from '@/api/portal'

/**
 * The portal's one combined inbox: every channel of one business in a single list,
 * newest first, like the staff app's Communications tab. Pure, so the ordering and the
 * filters are tested rather than eyeballed.
 *
 * The rules are copied from the staff app (`internal/client/src/components/Companies/
 * communications/inbox-clamp.ts` and `types.ts`) — the repos share no code.
 */
export type PortalItem =
  | { kind: 'email'; data: PortalEmail; sent: boolean }
  | { kind: 'chat'; data: PortalChat }
  | { kind: 'call'; data: PortalCall }
  | { kind: 'sms'; data: PortalSms }
  | { kind: 'whatsapp'; data: PortalWhatsApp }

/** What pages independently. Calls and texts share one phone timeline. */
export type SourceKind = 'email' | 'chat' | 'phone' | 'whatsapp'

export type KindFilter = 'all' | 'email' | 'sent' | 'chat' | 'calls' | 'texts' | 'whatsapp' | 'voicemail'
export type StatusFilter = 'all' | 'unread' | 'uncompleted'

/** Unique across channels: email and chat ids come from different providers. */
export function itemKey(item: PortalItem): string {
  return `${item.kind}:${item.data.id}`
}

/** The sort key. Exhaustive, so a new kind is a compile error rather than a silent 0. */
export function itemTime(item: PortalItem): number {
  switch (item.kind) {
    case 'email':
      return Date.parse(item.data.date) || 0
    case 'chat':
      return Date.parse(item.data.createTime) || 0
    case 'call':
    case 'sms':
    case 'whatsapp':
      return Date.parse(item.data.at) || 0
  }
}

/** Which sources a type filter needs fetched; the email folder Sent replaces the inbox. */
export function sourcesFor(kind: KindFilter): Record<SourceKind, boolean> {
  const all = kind === 'all'
  return {
    email: all || kind === 'email' || kind === 'sent',
    chat: all || kind === 'chat',
    phone: all || kind === 'calls' || kind === 'texts' || kind === 'voicemail',
    whatsapp: all || kind === 'whatsapp',
  }
}

export interface Source {
  kind: SourceKind
  items: PortalItem[]
  /** More pages exist. Only a source with more can hold the list back. */
  hasNext: boolean
}

/**
 * Merge the sources newest first, cut at the newest "oldest loaded" time among the
 * sources that still have more pages. Each source pages on its own, so without the cut
 * a deep email page would show old emails where newer, not-yet-loaded WhatsApp belongs,
 * and "Load more" would then insert rows ABOVE ones already on screen.
 *
 * An exhausted (or empty) source holds nothing back (-Infinity). Ties keep the FIRST source (strict
 * `>`), so source order decides which one pages next — same as the staff app.
 */
export function clampSources(sources: Source[]): { items: PortalItem[]; holdingBack: SourceKind | null } {
  const stamped = sources.flatMap((s) => s.items.map((item) => ({ ts: itemTime(item), item })))
  stamped.sort((a, b) => b.ts - a.ts)

  const tails = sources.map((s) => {
    let min = Infinity
    for (const it of s.items) min = Math.min(min, itemTime(it))
    return { kind: s.kind, tail: s.hasNext && s.items.length ? min : -Infinity }
  })
  const top = tails.reduce<{ kind: SourceKind; tail: number } | null>(
    (a, b) => (!a || b.tail > a.tail ? b : a),
    null,
  )
  if (!top || top.tail === -Infinity) {
    return { items: stamped.map((e) => e.item), holdingBack: null }
  }
  return { items: stamped.filter((e) => e.ts >= top.tail).map((e) => e.item), holdingBack: top.kind }
}

function matchesKind(item: PortalItem, kind: KindFilter): boolean {
  switch (kind) {
    case 'all':
      return true
    case 'email':
      return item.kind === 'email' && !item.sent
    case 'sent':
      return item.kind === 'email' && item.sent
    case 'chat':
      return item.kind === 'chat'
    case 'calls':
      return item.kind === 'call'
    case 'texts':
      return item.kind === 'sms'
    case 'whatsapp':
      return item.kind === 'whatsapp'
    case 'voicemail':
      return item.kind === 'call' && item.data.hasVoicemail
  }
}

/** The words a search looks in: who, subject and text. */
function searchText(item: PortalItem): string {
  switch (item.kind) {
    case 'email':
      return [item.data.from, item.data.to, item.data.subject, item.data.snippet].join(' ')
    case 'chat':
      return [item.data.sender, item.data.spaceName, item.data.text].join(' ')
    case 'call':
      return [item.data.counterpartyName, item.data.counterparty].join(' ')
    case 'sms':
      return [item.data.counterpartyName, item.data.counterparty, item.data.body].join(' ')
    case 'whatsapp':
      return [item.data.peerName, item.data.peer, item.data.body, item.data.transcript, item.data.filename].join(' ')
  }
}

export function matchesFilters(item: PortalItem, kind: KindFilter, status: StatusFilter, search: string): boolean {
  if (!matchesKind(item, kind)) return false
  if (status === 'unread' && item.data.isRead) return false
  if (status === 'uncompleted' && item.data.isCompleted) return false
  const q = search.trim().toLowerCase()
  if (!q) return true
  const text = searchText(item).toLowerCase()
  // Phone numbers are stored as +15145551234; let "514 555" find them.
  const digits = q.replace(/\D/g, '')
  return text.includes(q) || (digits.length >= 3 && text.replace(/\D/g, '').includes(digits))
}

/** What to tell the customer when the chat source reports anything but `ok`. */
export const CHAT_NOTICE: Record<string, string> = {
  needs_reconnect: "We can't reach your chat right now. Our team has been notified.",
  no_spaces: 'There are no chat conversations yet.',
  chat_disabled: 'Chat is turned off for this account.',
  no_license: 'This account has no chat license.',
  app_not_configured: 'Chat is not available yet.',
  error: 'We could not load your chats right now.',
}
