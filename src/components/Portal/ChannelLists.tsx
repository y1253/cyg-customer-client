import { useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Inbox,
  Loader2,
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
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  usePortalChats,
  usePortalEmails,
  usePortalPhone,
  usePortalWhatsApp,
} from '@/hooks/usePortal'
import { displayName, formatDuration, formatPhone, formatWhen } from '@/lib/portal-format'
import { cn } from '@/lib/utils'
import { MessageRow } from './MessageRow'
import type { Selection } from './portal-types'

type ListProps = { companyId: number; onOpen: (s: Selection) => void }

// ─── Shared shell ────────────────────────────────────────────────────────────

function ListShell({
  isPending,
  error,
  empty,
  emptyText,
  hasMore,
  loadingMore,
  onMore,
  children,
  banner,
}: {
  isPending: boolean
  error: Error | null
  empty: boolean
  emptyText: string
  hasMore: boolean
  loadingMore: boolean
  onMore: () => void
  children: ReactNode
  banner?: ReactNode
}) {
  if (isPending) {
    return (
      <Card className="gap-0 overflow-hidden py-0">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3 border-b px-4 py-4 last:border-b-0">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </Card>
    )
  }
  if (error) return <p className="text-sm text-destructive">{error.message}</p>
  return (
    <div className="flex flex-col gap-3">
      {banner}
      {empty ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden py-0">{children}</Card>
      )}
      {hasMore && (
        <Button variant="outline" className="self-center" onClick={onMore} disabled={loadingMore}>
          {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
          {loadingMore ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </div>
  )
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

// ─── Email ───────────────────────────────────────────────────────────────────

export function EmailList({ companyId, onOpen }: ListProps) {
  const [folder, setFolder] = useState<'INBOX' | 'SENT'>('INBOX')
  const q = usePortalEmails(companyId, folder, true)
  const rows = q.data?.pages.flatMap((p) => p.messages) ?? []
  const needsReconnect = q.data?.pages.some((p) => p.needsReconnect)

  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex w-fit rounded-lg bg-muted p-1">
        {(
          [
            ['INBOX', 'Inbox', Inbox],
            ['SENT', 'Sent', Send],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFolder(key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors',
              folder === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>
      <ListShell
        isPending={q.isPending}
        error={q.error}
        empty={rows.length === 0}
        emptyText={folder === 'SENT' ? 'No sent emails.' : 'No emails yet.'}
        hasMore={!!q.hasNextPage}
        loadingMore={q.isFetchingNextPage}
        onMore={() => void q.fetchNextPage()}
        banner={needsReconnect && <Notice>We can't reach this mailbox right now. Our team has been notified.</Notice>}
      >
        {rows.map((m) => {
          const who = folder === 'SENT' ? `To: ${displayName(m.to)}` : displayName(m.from)
          return (
            <MessageRow
              key={m.id}
              icon={<Mail />}
              iconClass="bg-indigo-50 text-indigo-600"
              title={who}
              subtitle={m.subject || '(no subject)'}
              snippet={m.snippet}
              when={formatWhen(m.date)}
              isRead={m.isRead}
              isCompleted={m.isCompleted}
              hasAttachment={m.hasAttachments}
              onClick={() =>
                onOpen({
                  kind: 'email',
                  threadId: m.threadId,
                  title: m.subject || '(no subject)',
                  isRead: m.isRead,
                  isCompleted: m.isCompleted,
                })
              }
            />
          )
        })}
      </ListShell>
    </div>
  )
}

// ─── Chat ────────────────────────────────────────────────────────────────────

const CHAT_NOTICE: Record<string, string> = {
  needs_reconnect: "We can't reach your chat right now. Our team has been notified.",
  no_spaces: 'There are no chat conversations yet.',
  chat_disabled: 'Chat is turned off for this account.',
  no_license: 'This account has no chat license.',
  app_not_configured: 'Chat is not available yet.',
  error: 'We could not load your chats right now.',
}

export function ChatList({ companyId, onOpen }: ListProps) {
  const q = usePortalChats(companyId, true)
  const rows = q.data?.pages.flatMap((p) => p.messages) ?? []
  const status = q.data?.pages[0]?.chatStatus
  return (
    <ListShell
      isPending={q.isPending}
      error={q.error}
      empty={rows.length === 0}
      emptyText="No chat messages yet."
      hasMore={!!q.hasNextPage}
      loadingMore={q.isFetchingNextPage}
      onMore={() => void q.fetchNextPage()}
      banner={status && status !== 'ok' && CHAT_NOTICE[status] && <Notice>{CHAT_NOTICE[status]}</Notice>}
    >
      {rows.map((m) => (
        <MessageRow
          key={m.id}
          icon={<MessageSquare />}
          iconClass="bg-violet-50 text-violet-600"
          title={m.sender || 'Unknown'}
          subtitle={m.spaceName}
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
      ))}
    </ListShell>
  )
}

// ─── Calls + texts ───────────────────────────────────────────────────────────

function callLook(c: PortalCall): { icon: ReactNode; cls: string; label: string } {
  if (c.hasVoicemail) return { icon: <Voicemail />, cls: 'bg-rose-50 text-rose-600', label: 'Voicemail' }
  if (c.direction === 'outbound') {
    return {
      icon: <PhoneOutgoing />,
      cls: 'bg-emerald-50 text-emerald-600',
      label: c.outcome === 'answered' ? 'Outgoing call' : 'Outgoing call · no answer',
    }
  }
  if (c.outcome === 'missed' || c.outcome === 'failed') {
    return { icon: <PhoneMissed />, cls: 'bg-rose-50 text-rose-600', label: 'Missed call' }
  }
  return { icon: <PhoneIncoming />, cls: 'bg-emerald-50 text-emerald-600', label: 'Incoming call' }
}

export function PhoneList({ companyId, onOpen }: ListProps) {
  const q = usePortalPhone(companyId, true)
  const rows = q.data?.pages.flatMap((p) => p.items) ?? []
  return (
    <ListShell
      isPending={q.isPending}
      error={q.error}
      empty={rows.length === 0}
      emptyText="No calls or text messages yet."
      hasMore={!!q.hasNextPage}
      loadingMore={q.isFetchingNextPage}
      onMore={() => void q.fetchNextPage()}
    >
      {rows.map((i) => {
        const who = i.counterpartyName || formatPhone(i.counterparty)
        if (i.kind === 'call') {
          const look = callLook(i)
          return (
            <MessageRow
              key={i.id}
              icon={look.icon}
              iconClass={look.cls}
              title={who}
              subtitle={`${look.label}${i.durationSec > 0 && i.outcome === 'answered' ? ` · ${formatDuration(i.durationSec)}` : ''}${i.hasRecording && !i.hasVoicemail ? ' · Recorded' : ''}`}
              when={formatWhen(i.at)}
              isRead={i.isRead}
              isCompleted={i.isCompleted}
              onClick={() => onOpen({ kind: 'call', call: i })}
            />
          )
        }
        return (
          <MessageRow
            key={i.id}
            icon={<MessageSquareText />}
            iconClass="bg-sky-50 text-sky-600"
            title={who}
            subtitle={i.direction === 'outbound' ? 'Text sent' : 'Text message'}
            snippet={i.body || (i.numMedia ? `${i.numMedia} attachment${i.numMedia > 1 ? 's' : ''}` : '')}
            hasAttachment={i.numMedia > 0}
            when={formatWhen(i.at)}
            isRead={i.isRead}
            isCompleted={i.isCompleted}
            onClick={() =>
              onOpen({
                kind: 'sms',
                peer: i.counterparty,
                msgId: i.id,
                title: who,
                isRead: i.isRead,
                isCompleted: i.isCompleted,
              })
            }
          />
        )
      })}
    </ListShell>
  )
}

// ─── WhatsApp ────────────────────────────────────────────────────────────────

function waSnippet(type: string, body: string | null, isVoice: boolean): string {
  if (body) return body
  if (isVoice) return 'Voice message'
  return (
    { image: 'Photo', video: 'Video', audio: 'Audio', document: 'Document', sticker: 'Sticker' }[type] ??
    'Message'
  )
}

export function WhatsAppList({ companyId, onOpen }: ListProps) {
  const q = usePortalWhatsApp(companyId, true)
  const rows = q.data?.pages.flatMap((p) => p.items) ?? []
  return (
    <ListShell
      isPending={q.isPending}
      error={q.error}
      empty={rows.length === 0}
      emptyText="No WhatsApp messages yet."
      hasMore={!!q.hasNextPage}
      loadingMore={q.isFetchingNextPage}
      onMore={() => void q.fetchNextPage()}
    >
      {rows.map((m) => {
        const who = m.peerName || formatPhone(m.peer)
        return (
          <MessageRow
            key={m.id}
            icon={<MessageCircle />}
            iconClass="bg-green-100 text-green-700"
            title={who}
            subtitle={m.direction === 'outbound' ? 'Sent' : 'Received'}
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
      })}
    </ListShell>
  )
}
