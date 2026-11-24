import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Bot,
  ChevronDown,
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
import { useTranslation } from 'react-i18next'
import i18n, { currentLocale } from '@/i18n'
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
import { useCallTranscript } from '@/hooks/useCallTranscript'
import { useCommChannels, useCommThread } from '@/hooks/useCommunications'
import { useIntake } from '@/hooks/useIntake'
import { formatPhone } from '@/lib/portal-format'
import { cn } from '@/lib/utils'

const CHANNEL_ICON: Record<CommChannel, typeof Mail> = {
  WHATSAPP: MessageCircle,
  SMS: MessageSquare,
  VOICE: Phone,
  EMAIL: Mail,
  BOT: Bot,
  UPLOADS: Upload,
}
const channelInfo = (c: CommChannel) => ({
  label: i18n.t(`books:comm.channel.${c}.label`),
  icon: CHANNEL_ICON[c],
  empty: i18n.t(`books:comm.channel.${c}.empty`),
})

type FileStatus =
  | 'MATCHED'
  | 'DONE'
  | 'UNMATCHED'
  | 'NEEDS_REVIEW'
  | 'UPLOADED'
  | 'PENDING'
  | 'PROCESSING'
  | 'FAILED'
  | 'DOCUMENT'
  | 'REMOVED'
const STATUS_TONE: Record<FileStatus, string> = {
  MATCHED: 'bg-emerald-50 text-emerald-700',
  DONE: 'bg-emerald-50 text-emerald-700',
  UNMATCHED: 'bg-amber-50 text-amber-700',
  NEEDS_REVIEW: 'bg-amber-50 text-amber-700',
  UPLOADED: 'bg-slate-100 text-slate-600',
  PENDING: 'bg-slate-100 text-slate-600',
  PROCESSING: 'bg-slate-100 text-slate-600',
  FAILED: 'bg-red-50 text-red-700',
  DOCUMENT: 'bg-sky-50 text-sky-800',
  REMOVED: 'bg-slate-100 text-slate-500',
}
const fileStatus = (s: string): { label: string; tone: string } | undefined =>
  s in STATUS_TONE
    ? { label: i18n.t(`books:comm.fileStatus.${s as FileStatus}`), tone: STATUS_TONE[s as FileStatus] }
    : undefined

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString(currentLocale(), { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

/** "Today 3:04 PM", "Oct 12", "Oct 12, 2025" — for the channel list. */
function fmtShort(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString(currentLocale(), { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString(currentLocale(), {
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
  const { t } = useTranslation(['books', 'common'])
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
            {t('comm.pick')}
          </div>
        )}
      </section>
    </div>
  )
}

function ChannelRow({ c, active, onClick }: { c: ChannelSummary; active: boolean; onClick: () => void }) {
  const { label, icon: Icon, empty } = channelInfo(c.channel)
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
          <span className="truncate text-xs text-muted-foreground">{c.preview ?? empty}</span>
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
  const { t } = useTranslation(['books', 'common'])
  const info = channelInfo(channel)
  const { label, icon: Icon } = info
  const intake = useIntake()
  // step12c: only point at calling while calling the AI actually works.
  const empty = channel === 'VOICE' && intake.data?.voice ? t('comm.noCallsCall') : info.empty
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
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label={t('comm.back')}>
          <ArrowLeft className="size-4" />
        </Button>
        <Icon className="size-4 text-[#1f8f86]" />
        <h3 className="text-sm font-semibold text-[#0B1C2C]">{label}</h3>
        {onOpenAssistant && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={onOpenAssistant}>
            {t('comm.continue')}
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
            {q.isFetchingNextPage ? t('common:status.loading') : t('comm.loadEarlier')}
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
  const { t } = useTranslation(['books', 'common'])
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
            {m.files[0]?.type === 'statement' ? t('comm.uploadedStatement') : t('comm.sentFile')}
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
  const { t } = useTranslation(['books', 'common'])
  const { auth } = useBook()
  const status = fileStatus(f.status)
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
      title={removed ? t('comm.removed') : t('comm.openFile')}
    >
      <Icon className="size-4 shrink-0" />
      <span className={cn('min-w-0 flex-1 truncate font-medium', removed && 'line-through')}>{f.filename}</span>
      {status && <Badge className={cn('shrink-0 text-[10px]', status.tone)}>{status.label}</Badge>}
    </button>
  )
}

const PURPOSES = ['INBOUND', 'ACCOUNT_STATUS', 'FINANCIAL_REPORT', 'AI_SCHEDULE', 'REQUESTED', 'THIRD_PARTY'] as const
const purposeLabel = (p: string) =>
  (PURPOSES as readonly string[]).includes(p)
    ? i18n.t(`books:comm.purpose.${p as (typeof PURPOSES)[number]}`)
    : i18n.t('books:comm.phoneCall')

type CallStatus = 'COMPLETED' | 'IN_PROGRESS' | 'RINGING' | 'NO_ANSWER' | 'FAILED'
const CALL_TONE: Record<CallStatus, string> = {
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  IN_PROGRESS: 'bg-sky-50 text-sky-800',
  RINGING: 'bg-sky-50 text-sky-800',
  NO_ANSWER: 'bg-amber-50 text-amber-700',
  FAILED: 'bg-red-50 text-red-700',
}
const callStatus = (s: string): { label: string; tone: string } | undefined =>
  s in CALL_TONE
    ? { label: i18n.t(`books:comm.callStatus.${s as CallStatus}`), tone: CALL_TONE[s as CallStatus] }
    : undefined

const fmtClock = (iso: string) =>
  new Date(iso).toLocaleTimeString(currentLocale(), { hour: 'numeric', minute: '2-digit' })

const fmtDuration = (s: number | null) =>
  s == null
    ? ''
    : s < 60
      ? i18n.t('common:duration.sec', { s })
      : i18n.t('common:duration.minSec', { m: Math.floor(s / 60), s: String(s % 60).padStart(2, '0') })

/**
 * step12: one phone call with the AI — who it was with, from which number to which, from
 * when till when (step12c). step12g: click it open for its recording (fetched with the
 * sign-in token only then) and what was said, line by line.
 */
function CallBubble({ call, at }: { call: CommCall; at: string }) {
  const { t } = useTranslation(['books', 'common'])
  const { auth } = useBook()
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const missed = call.status === 'NO_ANSWER' || call.status === 'FAILED'
  const canOpen = !missed && (call.hasRecording || call.hasTranscript !== false)
  const Icon = missed ? PhoneMissed : call.direction === 'OUTBOUND' ? PhoneOutgoing : PhoneIncoming
  const thirdParty = call.purpose === 'THIRD_PARTY'
  const who = call.withName
  const title = thirdParty
    ? t('comm.callWith', { who: who ?? t('comm.you') })
    : call.direction === 'INBOUND'
      ? who
        ? t('comm.theyCalled', { who })
        : t('comm.youCalled')
      : who
        ? t('comm.weCalledThem', { who })
        : t('comm.weCalledYou')
  const status = callStatus(call.status)
  const start = call.answeredAt ?? at
  const span = call.endedAt ? `${fmtTime(start)} – ${fmtClock(call.endedAt)}` : fmtTime(at)
  // The recording is fetched when the card opens and its object URL dropped when it closes.
  const toggle = () => {
    if (open) {
      setOpen(false)
      setUrl(null)
      return
    }
    setOpen(true)
    if (!call.hasRecording || url) return
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
        <button
          type="button"
          disabled={!canOpen}
          onClick={toggle}
          aria-expanded={open}
          className={cn('flex flex-col gap-2 text-left', canOpen ? 'cursor-pointer' : 'cursor-default')}
          title={canOpen ? (open ? t('comm.closeCall') : t('comm.openCall')) : undefined}
        >
          <div className="flex w-full items-start gap-2">
            <Icon className={cn('mt-0.5 size-4 shrink-0', missed ? 'text-red-600' : 'text-brand')} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[#0B1C2C]">{title}</p>
              <p className="text-xs text-muted-foreground">
                {missed
                  ? thirdParty
                    ? t('comm.nobodyAnswered')
                    : t('comm.missed')
                  : purposeLabel(call.purpose)}
              </p>
            </div>
            {status && <Badge className={cn('shrink-0 text-[10px]', status.tone)}>{status.label}</Badge>}
            {canOpen && (
              <ChevronDown
                className={cn('mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
              />
            )}
          </div>
          {(call.fromNumber || call.toNumber) && (
            <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-[#0B1C2C]">
              <span className="text-muted-foreground">{t('comm.from')}</span>
              <span className="font-medium tabular-nums">{call.fromNumber ? formatPhone(call.fromNumber) : '—'}</span>
              <span className="text-muted-foreground">→ {t('comm.to')}</span>
              <span className="font-medium tabular-nums">{call.toNumber ? formatPhone(call.toNumber) : '—'}</span>
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {[span, fmtDuration(call.durationSec)].filter(Boolean).join(' · ')}
            {canOpen && !open && (
              <span className="ml-1.5 font-medium text-[#1f8f86]">
                · {call.hasRecording ? t('comm.recordingTranscript') : t('comm.transcript')}
              </span>
            )}
          </p>
        </button>
        {open && (
          <div className="flex flex-col gap-2 border-t pt-2">
            {call.hasRecording &&
              (url ? (
                <audio controls src={url} className="w-full" />
              ) : loading ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> {t('comm.loadingRecording')}
                </p>
              ) : null)}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <CallTranscript call={call} />
          </div>
        )}
      </div>
    </div>
  )
}

/** step12g: what was said on a call — the person on the left, the AI on the right. */
function CallTranscript({ call }: { call: CommCall }) {
  const { t } = useTranslation(['books', 'common'])
  const q = useCallTranscript(call.id, true)
  const them = call.purpose === 'THIRD_PARTY' ? (call.contactName ?? call.withName ?? t('comm.them')) : t('comm.youCap')
  if (q.isLoading) return <Skeleton className="h-16 w-full" />
  if (q.error) return <p className="text-xs text-destructive">{q.error.message}</p>
  const lines = q.data ?? []
  if (!lines.length) return <p className="text-xs text-muted-foreground">{t('comm.noTranscript')}</p>
  return (
    <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto pr-1">
      {lines.map((l) => {
        const ai = l.role !== 'USER'
        return (
          <div key={l.id} className={cn('flex flex-col', ai ? 'items-end' : 'items-start')}>
            <div
              className={cn(
                'max-w-[90%] rounded-2xl px-3 py-1.5 text-[13px] break-words whitespace-pre-wrap',
                ai ? 'rounded-br-md bg-[#3BBFB4]/15 text-[#0B1C2C]' : 'rounded-bl-md bg-muted',
              )}
            >
              {l.text}
            </div>
            <span className="mt-0.5 text-[10px] text-muted-foreground">
              {ai ? t('comm.ai') : them} · {fmtClock(l.at)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
