import type { ReactNode } from 'react'
import {
  AlertTriangle,
  Mail,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Send,
  Voicemail,
} from 'lucide-react'
import type { PortalCall } from '@/api/portal'
import i18n from '@/i18n'
import { displayName, formatDuration, formatPhone, formatWhen } from '@/lib/portal-format'
import { MessageRow } from './MessageRow'
import type { Selection } from './portal-types'
import type { PortalItem } from './unified-inbox'

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

function callLook(c: PortalCall): { icon: ReactNode; cls: string; label: string } {
  if (c.hasVoicemail) return { icon: <Voicemail />, cls: 'bg-rose-50 text-rose-600', label: i18n.t('portal:row.voicemail') }
  if (c.direction === 'outbound') {
    return {
      icon: <PhoneOutgoing />,
      cls: 'bg-emerald-50 text-emerald-600',
      label: c.outcome === 'answered' ? i18n.t('portal:row.outgoingCall') : i18n.t('portal:row.outgoingNoAnswer'),
    }
  }
  if (c.outcome === 'missed' || c.outcome === 'failed') {
    return { icon: <PhoneMissed />, cls: 'bg-rose-50 text-rose-600', label: i18n.t('portal:row.missedCall') }
  }
  return { icon: <PhoneIncoming />, cls: 'bg-emerald-50 text-emerald-600', label: i18n.t('portal:row.incomingCall') }
}

function waSnippet(type: string, body: string | null, isVoice: boolean): string {
  if (body) return body
  if (isVoice) return i18n.t('portal:row.wa.voice')
  const known = (['image', 'video', 'audio', 'document', 'sticker'] as const).find((k) => k === type)
  return known ? i18n.t(`portal:row.wa.${known}`) : i18n.t('portal:row.wa.message')
}

/**
 * One row of the combined inbox. Each channel keeps its own icon and colour, and the
 * subtitle names the channel, so a mixed list still reads at a glance.
 */
export function PortalRow({
  item,
  chatLabel,
  onOpen,
}: {
  item: PortalItem
  /** "Chat" for Google, "Teams" for Microsoft. */
  chatLabel: string
  onOpen: (s: Selection) => void
}) {
  switch (item.kind) {
    case 'email': {
      const m = item.data
      const subject = m.subject || i18n.t('portal:row.noSubject')
      return (
        <MessageRow
          icon={item.sent ? <Send /> : <Mail />}
          iconClass="bg-indigo-50 text-indigo-600"
          title={item.sent ? i18n.t('portal:row.to', { name: displayName(m.to) }) : displayName(m.from)}
          subtitle={`${item.sent ? i18n.t('portal:row.sentEmail') : i18n.t('portal:row.email')} · ${subject}`}
          snippet={m.snippet}
          when={formatWhen(m.date)}
          isRead={m.isRead}
          isCompleted={m.isCompleted}
          hasAttachment={m.hasAttachments}
          onClick={() =>
            onOpen({ kind: 'email', threadId: m.threadId, title: subject, isRead: m.isRead, isCompleted: m.isCompleted })
          }
        />
      )
    }
    case 'chat': {
      const m = item.data
      return (
        <MessageRow
          icon={<MessageSquare />}
          iconClass="bg-violet-50 text-violet-600"
          title={m.sender || i18n.t('common:unknown')}
          subtitle={m.spaceName ? `${chatLabel} · ${m.spaceName}` : chatLabel}
          snippet={m.text}
          when={formatWhen(m.createTime)}
          isRead={m.isRead}
          isCompleted={m.isCompleted}
          hasAttachment={m.hasAttachments}
          onClick={() =>
            onOpen({
              kind: 'chat',
              spaceId: m.spaceId,
              msgId: m.id,
              title: m.spaceName || m.sender,
              isRead: m.isRead,
              isCompleted: m.isCompleted,
            })
          }
        />
      )
    }
    case 'call': {
      const c = item.data
      const look = callLook(c)
      return (
        <MessageRow
          icon={look.icon}
          iconClass={look.cls}
          title={c.counterpartyName || formatPhone(c.counterparty)}
          subtitle={`${look.label}${c.durationSec > 0 && c.outcome === 'answered' ? ` · ${formatDuration(c.durationSec)}` : ''}${c.hasRecording && !c.hasVoicemail ? ` · ${i18n.t('portal:row.recorded')}` : ''}`}
          when={formatWhen(c.at)}
          isRead={c.isRead}
          isCompleted={c.isCompleted}
          onClick={() => onOpen({ kind: 'call', call: c })}
        />
      )
    }
    case 'sms': {
      const s = item.data
      const who = s.counterpartyName || formatPhone(s.counterparty)
      return (
        <MessageRow
          icon={<MessageSquareText />}
          iconClass="bg-sky-50 text-sky-600"
          title={who}
          subtitle={s.direction === 'outbound' ? i18n.t('portal:row.textSent') : i18n.t('portal:row.textMessage')}
          snippet={s.body || (s.numMedia ? i18n.t('portal:row.attachments', { count: s.numMedia }) : '')}
          hasAttachment={s.numMedia > 0}
          when={formatWhen(s.at)}
          isRead={s.isRead}
          isCompleted={s.isCompleted}
          onClick={() =>
            onOpen({
              kind: 'sms',
              peer: s.counterparty,
              msgId: s.id,
              title: who,
              isRead: s.isRead,
              isCompleted: s.isCompleted,
            })
          }
        />
      )
    }
    case 'whatsapp': {
      const m = item.data
      const who = m.peerName || formatPhone(m.peer)
      return (
        <MessageRow
          icon={<MessageCircle />}
          iconClass="bg-green-100 text-green-700"
          title={who}
          subtitle={m.direction === 'outbound' ? i18n.t('portal:row.waSent') : i18n.t('portal:row.waReceived')}
          snippet={waSnippet(m.type, m.body, m.isVoice)}
          hasAttachment={m.hasMedia}
          when={formatWhen(m.at)}
          isRead={m.isRead}
          isCompleted={m.isCompleted}
          onClick={() =>
            onOpen({
              kind: 'whatsapp',
              peer: m.peer,
              msgId: m.id,
              title: who,
              isRead: m.isRead,
              isCompleted: m.isCompleted,
            })
          }
        />
      )
    }
  }
}
