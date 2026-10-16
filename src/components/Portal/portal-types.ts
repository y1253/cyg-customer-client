import type { PortalCall } from '@/api/portal'

/** What the detail sheet is showing. Carries the clicked row's tags for its header. */
export type Selection =
  | { kind: 'email'; threadId: string; title: string; isRead: boolean; isCompleted: boolean }
  | { kind: 'chat'; spaceId: string; msgId: string; title: string; isRead: boolean; isCompleted: boolean }
  | { kind: 'call'; call: PortalCall }
  | { kind: 'sms'; peer: string; msgId: string; title: string; isRead: boolean; isCompleted: boolean }
  | { kind: 'whatsapp'; peer: string; msgId: string; title: string; isRead: boolean; isCompleted: boolean }
