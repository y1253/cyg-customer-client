import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Download, FileText, Loader2, Paperclip } from 'lucide-react'
import {
  chatAttachmentUrl,
  emailAttachmentUrl,
  recordingUrl,
  smsMediaUrl,
  whatsappMediaUrl,
  type PortalEmailAttachment,
  type PortalEmailMessage,
  type PortalWhatsApp,
} from '@/api/portal'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { usePortalUnlock } from '@/context/PortalUnlockContext'
import {
  usePortalCallRecordings,
  usePortalChatThread,
  usePortalEmailThread,
  usePortalSmsThread,
  usePortalWhatsAppThread,
} from '@/hooks/usePortal'
import {
  displayName,
  formatBytes,
  formatDuration,
  formatFull,
  formatPhone,
} from '@/lib/portal-format'
import { cn } from '@/lib/utils'
import type { Selection } from './portal-types'
import { StatusBadges } from './StatusBadges'

/** The read-only detail of whatever row was clicked. */
export function ThreadSheet({
  companyId,
  selection,
  onClose,
}: {
  companyId: number
  selection: Selection | null
  onClose: () => void
}) {
  const tags =
    selection?.kind === 'call'
      ? { isRead: selection.call.isRead, isCompleted: selection.call.isCompleted }
      : selection
  const title =
    selection?.kind === 'call'
      ? selection.call.counterpartyName || formatPhone(selection.call.counterparty)
      : (selection?.title ?? '')

  return (
    <Sheet open={selection !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="truncate text-base">{title}</SheetTitle>
          <SheetDescription className="sr-only">Message details</SheetDescription>
          {tags && <StatusBadges isRead={tags.isRead} isCompleted={tags.isCompleted} className="mt-1.5" />}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-4">
          {selection?.kind === 'email' && <EmailThread companyId={companyId} threadId={selection.threadId} />}
          {selection?.kind === 'chat' && (
            <ChatThread companyId={companyId} spaceId={selection.spaceId} anchorId={selection.msgId} />
          )}
          {selection?.kind === 'call' && <CallDetail companyId={companyId} sel={selection} />}
          {selection?.kind === 'sms' && (
            <SmsThread companyId={companyId} peer={selection.peer} anchorId={selection.msgId} />
          )}
          {selection?.kind === 'whatsapp' && (
            <WhatsAppThread companyId={companyId} peer={selection.peer} anchorId={selection.msgId} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Loading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-3/4" />
    </div>
  )
}

// ─── Email ───────────────────────────────────────────────────────────────────

function EmailThread({ companyId, threadId }: { companyId: number; threadId: string }) {
  const q = usePortalEmailThread(companyId, threadId)
  if (q.isPending) return <Loading />
  if (q.isError) return <p className="text-sm text-destructive">{q.error.message}</p>
  return (
    <div className="flex flex-col gap-3">
      {q.data.messages.map((m) => (
        <EmailMessageCard key={m.id} companyId={companyId} m={m} />
      ))}
    </div>
  )
}

function EmailMessageCard({ companyId, m }: { companyId: number; m: PortalEmailMessage }) {
  const { unlockToken } = usePortalUnlock()
  const files = m.attachments.filter((a) => !a.isInline)
  const urlFor = (a: PortalEmailAttachment, download = false) =>
    emailAttachmentUrl(unlockToken ?? '', companyId, m.id, a, download)

  return (
    <div className="rounded-xl border bg-background shadow-sm">
      <div className="flex flex-col gap-0.5 px-4 pt-3 pb-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-semibold">{displayName(m.from)}</p>
          <p className="shrink-0 text-xs text-muted-foreground">{formatFull(m.date)}</p>
        </div>
        <p className="truncate text-xs text-muted-foreground">To: {m.to}</p>
        {m.cc && <p className="truncate text-xs text-muted-foreground">Cc: {m.cc}</p>}
      </div>
      <Separator />
      <div className="px-4 py-3">
        {m.bodyHtml ? (
          <EmailBody html={m.bodyHtml} attachments={m.attachments} urlFor={urlFor} />
        ) : (
          <p className="text-sm whitespace-pre-wrap">{m.bodyText}</p>
        )}
      </div>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t px-4 py-3">
          {files.map((a) => (
            <a
              key={`${a.filename}-${a.size}`}
              href={urlFor(a, true)}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2.5 py-1.5 text-xs hover:bg-muted"
            >
              <Paperclip className="h-3.5 w-3.5" />
              <span className="max-w-48 truncate">{a.filename}</span>
              <span className="text-muted-foreground">{formatBytes(a.size)}</span>
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * The email's own HTML in a sandboxed iframe: no scripts, links open in a new tab, and
 * inline `cid:` images point at the attachment route. Sized to its content.
 */
function EmailBody({
  html,
  attachments,
  urlFor,
}: {
  html: string
  attachments: PortalEmailAttachment[]
  urlFor: (a: PortalEmailAttachment) => string
}) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(120)
  const doc = useMemo(() => {
    const body = html.replace(/src\s*=\s*(["']?)cid:([^"'>\s]+)\1/gi, (match, _q: string, cid: string) => {
      const att = attachments.find((a) => a.contentId && a.contentId === cid)
      return att ? `src="${urlFor(att)}"` : match
    })
    return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{margin:0;font-family:system-ui,sans-serif;font-size:14px;color:#1f2937;word-break:break-word}img{max-width:100%;height:auto}</style></head><body>${body}</body></html>`
    // urlFor is rebuilt every render; the html and attachments are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, attachments])

  return (
    <iframe
      ref={ref}
      title="Email"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={doc}
      className="w-full border-0"
      style={{ height }}
      onLoad={() => {
        const h = ref.current?.contentDocument?.documentElement.scrollHeight
        if (h) setHeight(h + 8)
      }}
    />
  )
}

// ─── Bubbles (chat, texts, WhatsApp) ─────────────────────────────────────────

function useScrollToAnchor(ready: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ready) ref.current?.scrollIntoView({ block: 'center' })
  }, [ready])
  return ref
}

function Bubble({
  own,
  anchor,
  anchorRef,
  who,
  at,
  children,
}: {
  own: boolean
  anchor: boolean
  anchorRef?: React.Ref<HTMLDivElement>
  who?: string
  at: string
  children: ReactNode
}) {
  return (
    <div ref={anchor ? anchorRef : undefined} className={cn('flex', own ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm',
          own ? 'rounded-br-md bg-[#3BBFB4] text-white' : 'rounded-bl-md border bg-background',
          anchor && 'ring-2 ring-amber-400 ring-offset-2',
        )}
      >
        {who && <p className={cn('mb-0.5 text-xs font-semibold', own ? 'text-white/90' : 'text-[#1f8f86]')}>{who}</p>}
        {children}
        <p className={cn('mt-1 text-right text-[10px]', own ? 'text-white/75' : 'text-muted-foreground')}>
          {formatFull(at)}
        </p>
      </div>
    </div>
  )
}

function ChatThread({ companyId, spaceId, anchorId }: { companyId: number; spaceId: string; anchorId: string }) {
  const { unlockToken } = usePortalUnlock()
  const q = usePortalChatThread(companyId, spaceId)
  const anchorRef = useScrollToAnchor(q.isSuccess)
  if (q.isPending) return <Loading />
  if (q.isError) return <p className="text-sm text-destructive">{q.error.message}</p>
  const msgs = [...q.data.messages].sort((a, b) => a.createTime.localeCompare(b.createTime))
  return (
    <div className="flex flex-col gap-2.5">
      {msgs.map((m) => (
        <Bubble
          key={m.id}
          own={m.isOwn}
          anchor={m.id === anchorId}
          anchorRef={anchorRef}
          who={m.isOwn ? undefined : m.sender}
          at={m.createTime}
        >
          {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
          {m.attachments.map((a) => {
            const href = a.resourceName ? chatAttachmentUrl(unlockToken ?? '', companyId, a) : a.downloadUri
            if (!href) return null
            return a.contentType.startsWith('image/') && a.resourceName ? (
              <img key={href} src={href} alt={a.name} loading="lazy" className="mt-1.5 max-h-64 rounded-lg" />
            ) : (
              <FileLink key={href} href={href} name={a.name} />
            )
          })}
        </Bubble>
      ))}
    </div>
  )
}

function FileLink({ href, name }: { href: string; name: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-black/5 px-2 py-1 text-xs underline-offset-2 hover:underline"
    >
      <FileText className="h-3.5 w-3.5" /> {name}
    </a>
  )
}

function SmsThread({ companyId, peer, anchorId }: { companyId: number; peer: string; anchorId: string }) {
  const q = usePortalSmsThread(companyId, peer)
  const anchorRef = useScrollToAnchor(q.isSuccess)
  if (q.isPending) return <Loading />
  if (q.isError) return <p className="text-sm text-destructive">{q.error.message}</p>
  return (
    <div className="flex flex-col gap-2.5">
      {q.data.messages.map((m) => (
        <Bubble key={m.id} own={m.direction === 'outbound'} anchor={m.id === anchorId} anchorRef={anchorRef} at={m.at}>
          {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
          {m.media.map((media) => {
            const href = smsMediaUrl(media, m.sid)
            if (media.contentType.startsWith('image/'))
              return <img key={media.sid} src={href} alt="" loading="lazy" className="mt-1.5 max-h-64 rounded-lg" />
            if (media.contentType.startsWith('audio/'))
              return <audio key={media.sid} src={href} controls className="mt-1.5 w-56" />
            if (media.contentType.startsWith('video/'))
              return <video key={media.sid} src={href} controls className="mt-1.5 max-h-64 rounded-lg" />
            return <FileLink key={media.sid} href={href} name="Attachment" />
          })}
        </Bubble>
      ))}
    </div>
  )
}

function WhatsAppThread({ companyId, peer, anchorId }: { companyId: number; peer: string; anchorId: string }) {
  const q = usePortalWhatsAppThread(companyId, peer)
  const anchorRef = useScrollToAnchor(q.isSuccess)
  if (q.isPending) return <Loading />
  if (q.isError) return <p className="text-sm text-destructive">{q.error.message}</p>
  return (
    <div className="flex flex-col gap-2.5">
      {q.data.messages.map((m) => (
        <Bubble key={m.id} own={m.direction === 'outbound'} anchor={m.id === anchorId} anchorRef={anchorRef} at={m.at}>
          <WhatsAppContent companyId={companyId} m={m} />
        </Bubble>
      ))}
    </div>
  )
}

function WhatsAppContent({ companyId, m }: { companyId: number; m: PortalWhatsApp }) {
  const { unlockToken } = usePortalUnlock()
  const ready = m.hasMedia && m.mediaStatus !== 'pending' && m.mediaStatus !== 'failed'
  const url = (opts: { playback?: boolean; download?: boolean } = {}) =>
    whatsappMediaUrl(unlockToken ?? '', companyId, m.messageId, opts)

  let media: ReactNode = null
  if (m.hasMedia && !ready) {
    media = (
      <p className="flex items-center gap-1.5 text-xs opacity-80">
        {m.mediaStatus === 'failed' ? 'File unavailable' : <><Loader2 className="h-3 w-3 animate-spin" /> Loading file…</>}
      </p>
    )
  } else if (ready) {
    if (m.type === 'image' || m.type === 'sticker') {
      media = <img src={url()} alt="" loading="lazy" className="max-h-72 rounded-lg" />
    } else if (m.type === 'video') {
      media = <video src={url()} controls className="max-h-72 rounded-lg" />
    } else if (m.type === 'audio') {
      media = (
        <div className="flex flex-col gap-1">
          <audio src={url({ playback: true })} controls className="w-60" />
          {m.durationSec != null && <span className="text-xs opacity-75">{formatDuration(m.durationSec)}</span>}
        </div>
      )
    } else {
      media = <FileLink href={url({ download: true })} name={m.filename || 'Document'} />
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {media}
      {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
      {m.transcript && <p className="text-xs italic opacity-80">“{m.transcript}”</p>}
    </div>
  )
}

// ─── Call ────────────────────────────────────────────────────────────────────

function CallDetail({ companyId, sel }: { companyId: number; sel: Extract<Selection, { kind: 'call' }> }) {
  const c = sel.call
  const recs = usePortalCallRecordings(companyId, c.hasRecording ? c.sid : null)
  const outcome = c.hasVoicemail
    ? 'Voicemail'
    : c.outcome === 'answered'
      ? 'Answered'
      : c.outcome === 'in-progress'
        ? 'In progress'
        : c.direction === 'outbound'
          ? 'No answer'
          : 'Missed'

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 rounded-xl border bg-background p-4 text-sm shadow-sm">
        <Info label="Direction" value={c.direction === 'inbound' ? 'Incoming' : 'Outgoing'} />
        <Info label="Result" value={outcome} />
        <Info label="Number" value={formatPhone(c.counterparty)} />
        <Info label="When" value={formatFull(c.at)} />
        {c.durationSec > 0 && <Info label="Duration" value={formatDuration(c.durationSec)} />}
      </div>
      {c.hasRecording && (
        <div className="flex flex-col gap-2 rounded-xl border bg-background p-4 shadow-sm">
          <p className="text-sm font-medium">{c.hasVoicemail ? 'Voicemail' : 'Recording'}</p>
          {recs.isPending ? (
            <Skeleton className="h-10 w-full" />
          ) : recs.isError ? (
            <p className="text-sm text-destructive">{recs.error.message}</p>
          ) : recs.data.recordings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recording is available.</p>
          ) : (
            recs.data.recordings.map((r) => <audio key={r.sid} src={recordingUrl(r)} controls className="w-full" />)
          )}
        </div>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
