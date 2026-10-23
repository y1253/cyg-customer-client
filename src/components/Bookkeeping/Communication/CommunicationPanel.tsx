import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Bot,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Paperclip,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Upload,
} from 'lucide-react'
import {
  callRecordingUrl,
  openCommFile,
  type ChannelSummary,
  type CommCall,
  type CommChannel,
  type CommFile,
  type CommItem,
} from '@/api/communications'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useBook } from '@/hooks/useBook'
import { useCommChannels, useCommThread } from '@/hooks/useCommunications'
import { useIntake } from '@/hooks/useIntake'
import { formatPhone } from '@/lib/portal-format'
import { cn } from '@/lib/utils'

const CHANNEL: Record<CommChannel, { label: string; icon: typeof Mail; empty: string }> = {
  WHATSAPP: { label: 'WhatsApp', icon: MessageCircle, empty: 'Nothing on WhatsApp yet.' },
  SMS: { label: 'Text messages', icon: MessageSquare, empty: 'No text messages yet.' },
  VOICE: { label: 'Phone calls', icon: Phone, empty: 'No calls with the AI yet.' },
  EMAIL: { label: 'Email', icon: Mail, empty: 'No emails yet.' },
  BOT: { label: 'Website chat', icon: Bot, empty: 'No chats on the website yet.' },
  UPLOADS: { label: 'Uploads', icon: Upload, empty: 'Nothing uploaded on the website yet.' },
}

const STATUS: Record<string, { label: string; tone: string }> = {
  MATCHED: { label: 'Filed', tone: 'bg-emerald-50 text-emerald-700' },
  DONE: { label: 'Read', tone: 'bg-emerald-50 text-emerald-700' },
  UNMATCHED: { label: 'Not matched yet', tone: 'bg-amber-50 text-amber-700' },
  NEEDS_REVIEW: { label: 'Needs review', tone: 'bg-amber-50 text-amber-700' },
  UPLOADED: { label: 'Waiting for Generate', tone: 'bg-slate-100 text-slate-600' },
  PENDING: { label: 'Reading…', tone: 'bg-slate-100 text-slate-600' },
  PROCESSING: { label: 'Reading…', tone: 'bg-slate-100 text-slate-600' },
  FAILED: { label: "Couldn't read", tone: 'bg-red-50 text-red-700' },
  DOCUMENT: { label: 'Document', tone: 'bg-sky-50 text-sky-800' },
  REMOVED: { label: 'Removed', tone: 'bg-slate-100 text-slate-500' },
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

/** "Today 3:04 PM", "Oct 12", "Oct 12, 2025" — for the channel list. */
function fmtShort(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  })
}

/**
 * Everything the customer exchanged with us (step12), one chat per channel — WhatsApp,
 * text, email, the website chat — opened like a phone conversation, and a chat of what
 * they uploaded on the site, each file with the time it came in and where it stands.
 * Read-only: texts and emails are answered on the phone / by email, the website chat on
 * the Assistant tab.
 */
export function CommunicationPanel({ onOpenAssistant }: { onOpenAssistant?: () => void }) {
  const channels = useCommChannels()
  const [picked, setOpen] = useState<CommChannel | null>(null)
  // On a wide screen the newest chat is open from the start; a phone starts on the list.
  const [wide] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  // The channels that have something, newest first; the empty ones after, in fixed order.
  const list = [...(channels.data ?? [])].sort(
    (a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''),
  )
  const open = picked ?? (wide && list[0]?.lastAt ? list[0].channel : null)

  return (
    <div className="grid overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 md:grid-cols-[18rem_1fr]">
      <aside className={cn('border-b md:border-r md:border-b-0', open && 'hidden md:block')}>
        {channels.isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : (
          <ul className="flex flex-col p-2">
            {list.map((c) => (
              <ChannelRow key={c.channel} c={c} active={open === c.channel} onClick={() => setOpen(c.channel)} />
            ))}
          </ul>
        )}
        {channels.error && <p className="px-4 pb-3 text-sm text-destructive">{channels.error.message}</p>}
      </aside>
      <section className={cn('min-w-0', !open && 'hidden md:block')}>
        {open ? (
          <Thread
            key={open}
            channel={open}
            onBack={() => setOpen(null)}
            onOpenAssistant={open === 'BOT' ? onOpenAssistant : undefined}
          />
        ) : (
          <div className="flex h-full min-h-60 items-center justify-center p-8 text-center text-sm text-muted-foreground">
            Pick a conversation to see everything sent on it.
          </div>
        )}
      </section>
    </div>
  )
}

function ChannelRow({ c, active, onClick }: { c: ChannelSummary; active: boolean; onClick: () => void }) {
  const { label, icon: Icon } = CHANNEL[c.channel]
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
          active ? 'bg-brand/10' : 'hover:bg-muted/60',
        )}
      >
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full',
            c.lastAt ? 'bg-[#3BBFB4]/15 text-[#1f8f86]' : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold text-[#0B1C2C]">{label}</span>
            {c.lastAt && <span className="shrink-0 text-[11px] text-muted-foreground">{fmtShort(c.lastAt)}</span>}
          </span>
          <span className="truncate text-xs text-muted-foreground">{c.preview ?? CHANNEL[c.channel].empty}</span>
        </span>
      </button>
    </li>
  )
}

function Thread({
  channel,
  onBack,
  onOpenAssistant,
}: {
  channel: CommChannel
  onBack: () => void
  onOpenAssistant?: () => void
}) {
  const { label, icon: Icon } = CHANNEL[channel]
  const intake = useIntake()
  // step12c: only point at calling while calling the AI actually works.
  const empty =
    channel === 'VOICE' && intake.data?.voice
      ? 'No calls with the AI yet. Call our receipt number to talk to it.'
      : CHANNEL[channel].empty
  const q = useCommThread(channel)
  const scroller = useRef<HTMLDivElement>(null)
  // Oldest at the top, like a phone; the pages come newest first.
  const items = (q.data?.pages ?? []).flatMap((p) => p.items).reverse()
  const [openError, setOpenError] = useState<string | null>(null)

  // Land at the newest message; keep the view still when older ones are added above.
  const height = useRef(0)
  const pages = q.data?.pages.length ?? 0
  const first = useRef(true)
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el || !pages) return
    if (first.current) {
      el.scrollTop = el.scrollHeight
      first.current = false
    } else if (height.current) {
      el.scrollTop += el.scrollHeight - height.current
    }
    height.current = el.scrollHeight
  }, [pages])

  const loadOlder = () => {
    if (scroller.current) height.current = scroller.current.scrollHeight
    void q.fetchNextPage()
  }

  return (
    <div className="flex h-[70vh] min-h-96 flex-col">
      <header className="flex items-center gap-2 border-b px-3 py-2.5">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Back to conversations">
          <ArrowLeft className="size-4" />
        </Button>
        <Icon className="size-4 text-[#1f8f86]" />
        <h3 className="text-sm font-semibold text-[#0B1C2C]">{label}</h3>
        {onOpenAssistant && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={onOpenAssistant}>
            Continue on the Assistant tab
          </Button>
        )}
      </header>
      <div
        ref={scroller}
        className="flex flex-1 flex-col gap-2 overflow-y-auto bg-muted/30 px-3 py-4"
        onScroll={(e) => {
          if (e.currentTarget.scrollTop < 80 && q.hasNextPage && !q.isFetchingNextPage) loadOlder()
        }}
      >
        {q.hasNextPage && (
          <Button variant="ghost" size="sm" className="self-center" disabled={q.isFetchingNextPage} onClick={loadOlder}>
            {q.isFetchingNextPage ? 'Loading…' : 'Load earlier'}
          </Button>
        )}
        {q.isLoading && <Skeleton className="h-16 w-2/3" />}
        {!q.isLoading && !items.length && (
          <p className="m-auto text-sm text-muted-foreground">{empty}</p>
        )}
        {items.map((m) => (
          <Bubble key={m.key} m={m} onError={setOpenError} />
        ))}
      </div>
      {(q.error || openError) && (
        <p className="border-t px-4 py-2 text-sm text-destructive">{q.error?.message ?? openError}</p>
      )}
    </div>
  )
}

function Bubble({ m, onError }: { m: CommItem; onError: (msg: string) => void }) {
  if (m.kind === 'call' && m.call) return <CallBubble call={m.call} at={m.at} />
  const own = m.side === 'customer'
  return (
    <div className={cn('flex', own ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[70%]',
          own ? 'rounded-br-md bg-[#3BBFB4] text-white' : 'rounded-bl-md border bg-background',
        )}
      >
        {!own && <p className="mb-0.5 text-xs font-semibold text-[#1f8f86]">CYG Finance</p>}
        {m.kind === 'upload' && (
          <p className={cn('mb-1 text-xs', own ? 'text-white/85' : 'text-muted-foreground')}>
            {m.files[0]?.type === 'statement' ? 'Uploaded a statement' : 'Sent a file'}
          </p>
        )}
        {m.files.length > 0 && (
          <div className="mb-1 flex flex-col gap-1">
            {m.files.map((f) => (
              <FileChip key={`${f.type}:${f.id}`} f={f} own={own} onError={onError} />
            ))}
          </div>
        )}
        {m.text && <p className="break-words whitespace-pre-wrap">{m.text}</p>}
        {m.warning && <p className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">{m.warning}</p>}
        <p className={cn('mt-1 text-right text-[10px]', own ? 'text-white/75' : 'text-muted-foreground')}>{fmtTime(m.at)}</p>
      </div>
    </div>
  )
}

function FileChip({ f, own, onError }: { f: CommFile; own: boolean; onError: (msg: string) => void }) {
  const { auth } = useBook()
  const status = STATUS[f.status]
  const removed = f.status === 'REMOVED'
  const Icon = f.type === 'statement' ? FileText : Paperclip
  return (
    <button
      type="button"
      disabled={removed}
      onClick={() => openCommFile(auth, f).catch((e: Error) => onError(e.message))}
      className={cn(
        'flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs',
        own ? 'bg-white/15 hover:bg-white/25' : 'bg-muted hover:bg-muted/70',
        removed && 'cursor-default opacity-70',
      )}
      title={removed ? 'This file was removed since' : 'Open the file'}
    >
      <Icon className="size-4 shrink-0" />
      <span className={cn('min-w-0 flex-1 truncate font-medium', removed && 'line-through')}>{f.filename}</span>
      {status && <Badge className={cn('shrink-0 text-[10px]', status.tone)}>{status.label}</Badge>}
    </button>
  )
}

const PURPOSE: Record<string, string> = {
  INBOUND: 'You called us',
  ACCOUNT_STATUS: 'We called with your account status',
  FINANCIAL_REPORT: 'We called with your financial report',
  AI_SCHEDULE: 'We called with a message you scheduled',
  REQUESTED: 'We called you back, as you asked',
  THIRD_PARTY: 'We called them for you',
}

const CALL_STATUS: Record<string, { label: string; tone: string }> = {
  COMPLETED: { label: 'Completed', tone: 'bg-emerald-50 text-emerald-700' },
  IN_PROGRESS: { label: 'In progress', tone: 'bg-sky-50 text-sky-800' },
  RINGING: { label: 'Ringing', tone: 'bg-sky-50 text-sky-800' },
  NO_ANSWER: { label: 'No answer', tone: 'bg-amber-50 text-amber-700' },
  FAILED: { label: 'Failed', tone: 'bg-red-50 text-red-700' },
}

const fmtClock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

const fmtDuration = (s: number | null) =>
  s == null ? '' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`

/**
 * step12: one phone call with the AI — who it was with, from which number to which, from
 * when till when (step12c), and its recording (fetched with the sign-in token only when
 * asked for). What was said is in the bubbles around it.
 */
function CallBubble({ call, at }: { call: CommCall; at: string }) {
  const { auth } = useBook()
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const missed = call.status === 'NO_ANSWER' || call.status === 'FAILED'
  const Icon = missed ? PhoneMissed : call.direction === 'OUTBOUND' ? PhoneOutgoing : PhoneIncoming
  const thirdParty = call.purpose === 'THIRD_PARTY'
  const who = call.withName ?? 'you'
  const title = thirdParty
    ? `Call with ${who}`
    : call.direction === 'INBOUND'
      ? `${who === 'you' ? 'You' : who} called us`
      : `We called ${who === 'you' ? 'you' : who}`
  const status = CALL_STATUS[call.status]
  const start = call.answeredAt ?? at
  const span = call.endedAt ? `${fmtTime(start)} – ${fmtClock(call.endedAt)}` : fmtTime(at)
  const load = () => {
    setLoading(true)
    setError(null)
    callRecordingUrl(auth, call.id)
      .then(setUrl, (e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])
  return (
    <div className="flex justify-center">
      <div className="flex w-full max-w-md flex-col gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-sm shadow-sm">
        <div className="flex items-start gap-2">
          <Icon className={cn('mt-0.5 size-4 shrink-0', missed ? 'text-red-600' : 'text-brand')} />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[#0B1C2C]">{title}</p>
            <p className="text-xs text-muted-foreground">
              {missed
                ? thirdParty
                  ? 'Nobody answered'
                  : 'Missed — we sent it by text or email instead'
                : (PURPOSE[call.purpose] ?? 'Phone call')}
            </p>
          </div>
          {status && <Badge className={cn('shrink-0 text-[10px]', status.tone)}>{status.label}</Badge>}
        </div>
        {(call.fromNumber || call.toNumber) && (
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-[#0B1C2C]">
            <span className="text-muted-foreground">From</span>
            <span className="font-medium tabular-nums">{call.fromNumber ? formatPhone(call.fromNumber) : '—'}</span>
            <span className="text-muted-foreground">→ To</span>
            <span className="font-medium tabular-nums">{call.toNumber ? formatPhone(call.toNumber) : '—'}</span>
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {[span, fmtDuration(call.durationSec)].filter(Boolean).join(' · ')}
        </p>
        {!missed &&
          (url ? (
            <audio controls src={url} className="w-full" />
          ) : call.hasRecording ? (
            <Button size="sm" variant="outline" onClick={load} disabled={loading} className="w-fit gap-1.5">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Phone className="size-4" />} Play recording
            </Button>
          ) : null)}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  )
}
