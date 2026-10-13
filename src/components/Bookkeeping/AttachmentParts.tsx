import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MessageSquareText,
  Mic,
  Receipt,
  SearchX,
  Wallet,
} from 'lucide-react'
import type { Attachment } from '@/api/attachments'
import type { AttachmentKind } from '@/api/bookkeeping'
import { Badge } from '@/components/ui/badge'
import { useAttachmentUrl } from '@/hooks/useAttachments'
import { fmtDay, fmtPhone } from '@/lib/attachment-labels'
import { money } from '@/lib/money'

export function KindIcon({ kind, className = 'size-4' }: { kind: AttachmentKind; className?: string }) {
  if (kind === 'RECEIPT') return <Receipt className={className} />
  if (kind === 'CHECK') return <Wallet className={className} />
  if (kind === 'AUDIO') return <Mic className={className} />
  if (kind === 'TEXT') return <MessageSquareText className={className} />
  return <FileText className={className} />
}

export function AttachmentStatusBadge({ a }: { a: Attachment }) {
  if (a.status === 'MATCHED') {
    return (
      <Badge className="gap-1 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
        <CheckCircle2 className="size-3" /> Matched
      </Badge>
    )
  }
  if (a.status === 'UNMATCHED') {
    return (
      <Badge className="gap-1 bg-amber-50 text-amber-800 ring-1 ring-amber-600/20">
        <SearchX className="size-3" /> Choose transaction
      </Badge>
    )
  }
  if (a.status === 'FAILED') {
    return (
      <Badge className="gap-1 bg-red-50 text-red-700 ring-1 ring-red-600/20">
        <AlertCircle className="size-3" /> Failed
      </Badge>
    )
  }
  if (a.status === 'PROCESSING') {
    return (
      <Badge className="gap-1 bg-brand/10 text-brand ring-1 ring-brand/25">
        <Loader2 className="size-3 animate-spin" /> Reading…
      </Badge>
    )
  }
  return (
    <Badge className="gap-1 bg-slate-100 text-slate-600 ring-1 ring-slate-500/15">
      <Clock className="size-3" /> Queued
    </Badge>
  )
}

/**
 * The file itself: a picture, a player, or the PDF in a frame. Fetched with the token. A
 * text message has no file worth showing — its words are shown by `ReadingSummary`.
 */
export function AttachmentPreview({ a }: { a: Pick<Attachment, 'id' | 'mimeType' | 'filename'> }) {
  if (a.mimeType.startsWith('text/')) return null
  return <FilePreview a={a} />
}

function FilePreview({ a }: { a: Pick<Attachment, 'id' | 'mimeType' | 'filename'> }) {
  const file = useAttachmentUrl(a.id)
  if (file.error) return <p className="text-sm text-destructive">{file.error}</p>
  if (!file.url) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-muted/50">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (a.mimeType.startsWith('image/')) {
    return (
      <a href={file.url} target="_blank" rel="noreferrer" title="Open full size">
        <img src={file.url} alt={a.filename} className="max-h-[50vh] w-full rounded-xl bg-muted/30 object-contain" />
      </a>
    )
  }
  if (a.mimeType.startsWith('audio/')) {
    return <audio controls src={file.url} className="w-full" />
  }
  return <iframe src={file.url} title={a.filename} className="h-[50vh] w-full rounded-xl border" />
}

/** What the AI read, in a few lines: vendor, date, total, the items, a transcript. */
export function ReadingSummary({ a }: { a: Attachment }) {
  const r = a.reading
  const texted = a.message && (
    <p className="rounded-2xl rounded-bl-sm bg-brand/10 px-3 py-2 text-sm text-[#0B1C2C]">
      <span className="mb-0.5 block text-[11px] font-medium text-brand">
        Text from {fmtPhone(a.sourcePhone)}
      </span>
      {a.message}
    </p>
  )
  if (!r) return texted || null
  const facts = [
    r.vendor ?? r.payee,
    r.date && fmtDay(r.date),
    a.total != null && money(a.total),
    r.tax != null && `tax ${money(r.tax)}`,
    r.checkNumber && `cheque #${r.checkNumber}`,
  ].filter(Boolean)
  return (
    <div className="flex flex-col gap-2 text-sm">
      {texted}
      {facts.length > 0 && <p className="font-medium text-[#0B1C2C]">{facts.join(' · ')}</p>}
      {r.memo && <p className="text-muted-foreground">Memo: {r.memo}</p>}
      {r.items.length > 0 && (
        <ul className="divide-y rounded-lg bg-muted/40 px-3 text-xs">
          {r.items.map((i, n) => (
            <li key={n} className="flex justify-between gap-3 py-1.5">
              <span className="truncate">{i.name}</span>
              <span className="shrink-0 tabular-nums">{money(i.amount)}</span>
            </li>
          ))}
        </ul>
      )}
      {r.transcript && <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground italic">“{r.transcript}”</p>}
    </div>
  )
}
