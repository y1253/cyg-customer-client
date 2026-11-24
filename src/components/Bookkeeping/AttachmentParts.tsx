import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  Landmark,
  Loader2,
  Mail,
  MessageSquareText,
  Mic,
  Receipt,
  ScrollText,
  SearchX,
  Wallet,
} from 'lucide-react'
import { isSpreadsheetMime, type Attachment } from '@/api/attachments'
import type { AttachmentKind } from '@/api/bookkeeping'
import { Badge } from '@/components/ui/badge'
import { useAttachmentUrl } from '@/hooks/useAttachments'
import { fmtDay, fmtPhone } from '@/lib/attachment-labels'
import { money } from '@/lib/money'

export function KindIcon({ kind, className = 'size-4' }: { kind: AttachmentKind; className?: string }) {
  if (kind === 'RECEIPT') return <Receipt className={className} />
  if (kind === 'INVOICE') return <ScrollText className={className} />
  if (kind === 'CHECK') return <Wallet className={className} />
  if (kind === 'DEPOSIT_SLIP') return <Landmark className={className} />
  if (kind === 'DOCUMENT') return <Mail className={className} />
  if (kind === 'AUDIO') return <Mic className={className} />
  if (kind === 'TEXT') return <MessageSquareText className={className} />
  return <FileText className={className} />
}

export function AttachmentStatusBadge({ a }: { a: Attachment }) {
  const { t } = useTranslation('ledger')
  if (a.status === 'MATCHED') {
    return (
      <Badge className="gap-1 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
        <CheckCircle2 className="size-3" /> {t('status.matched')}
      </Badge>
    )
  }
  if (a.status === 'UNMATCHED') {
    return (
      <Badge className="gap-1 bg-amber-50 text-amber-800 ring-1 ring-amber-600/20">
        <SearchX className="size-3" /> {t('status.choose')}
      </Badge>
    )
  }
  if (a.status === 'DOCUMENT') {
    return (
      <Badge className="gap-1 bg-sky-50 text-sky-800 ring-1 ring-sky-600/20">
        <Mail className="size-3" /> {t('status.document')}
      </Badge>
    )
  }
  if (a.status === 'FAILED') {
    return (
      <Badge className="gap-1 bg-red-50 text-red-700 ring-1 ring-red-600/20">
        <AlertCircle className="size-3" /> {t('status.failed')}
      </Badge>
    )
  }
  if (a.status === 'PROCESSING') {
    return (
      <Badge className="gap-1 bg-brand/10 text-brand ring-1 ring-brand/25">
        <Loader2 className="size-3 animate-spin" /> {t('status.reading')}
      </Badge>
    )
  }
  return (
    <Badge className="gap-1 bg-slate-100 text-slate-600 ring-1 ring-slate-500/15">
      <Clock className="size-3" /> {t('status.queued')}
    </Badge>
  )
}

/**
 * The file itself: a picture, a player, or the PDF in a frame. Fetched with the token. A
 * text message has no file worth showing — its words are shown by `ReadingSummary`.
 */
type Previewed = Pick<Attachment, 'id' | 'mimeType' | 'filename'> &
  Partial<Pick<Attachment, 'size' | 'cropped' | 'hasOriginal'>>

export function AttachmentPreview({ a }: { a: Previewed }) {
  const { t } = useTranslation('ledger')
  // The file, the whole image a crop was cut from (step9), or the picture as it was sent
  // before the clean-up pass (step2, 2026-11-13).
  const [view, setView] = useState<'file' | 'whole' | 'raw'>('file')
  if (a.mimeType.startsWith('text/')) return null
  const toggle = (v: 'whole' | 'raw') => setView((cur) => (cur === v ? 'file' : v))
  return (
    <div className="flex flex-col gap-1">
      <FilePreview a={a} view={view} />
      <div className="flex flex-wrap gap-x-3">
        {/* step9: a cheque cut out of an image that held several — the whole image on demand. */}
        {a.cropped && (
          <button type="button" onClick={() => toggle('whole')} className="text-xs font-medium text-brand hover:underline">
            {view === 'whole' ? t('preview.onlyThis') : t('preview.whole')}
          </button>
        )}
        {a.hasOriginal && (
          <button type="button" onClick={() => toggle('raw')} className="text-xs font-medium text-brand hover:underline">
            {view === 'raw' ? t('preview.cleaned') : t('preview.original')}
          </button>
        )}
      </div>
    </div>
  )
}

function FilePreview({ a, view }: { a: Previewed; view: 'file' | 'whole' | 'raw' }) {
  const { t } = useTranslation('ledger')
  const whole = view !== 'file'
  const file = useAttachmentUrl(a.id, `${a.size ?? ''}:${a.mimeType}`, view === 'raw' ? 'raw' : whole)
  if (file.error) return <p className="text-sm text-destructive">{file.error}</p>
  if (!file.url) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-muted/50">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (a.mimeType.startsWith('image/') || whole) {
    return (
      <a href={file.url} target="_blank" rel="noreferrer" title={t('preview.fullSize')}>
        <img src={file.url} alt={a.filename} className="max-h-[50vh] w-full rounded-xl bg-muted/30 object-contain" />
      </a>
    )
  }
  if (a.mimeType.startsWith('audio/')) {
    return <audio controls src={file.url} className="w-full" />
  }
  if (isSpreadsheetMime(a.mimeType)) {
    return (
      <a
        href={file.url}
        download={a.filename}
        className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-4 text-sm font-medium text-brand hover:underline"
      >
        <FileSpreadsheet className="size-5" />
        {t('preview.download', { name: a.filename })}
      </a>
    )
  }
  return <iframe src={file.url} title={a.filename} className="h-[50vh] w-full rounded-xl border" />
}

/** What the AI read, in a few lines: vendor, date, total, the items, a transcript. */
export function ReadingSummary({ a }: { a: Attachment }) {
  const { t } = useTranslation('ledger')
  const r = a.reading
  const texted = a.message && (
    <p className="rounded-2xl rounded-bl-sm bg-brand/10 px-3 py-2 text-sm text-[#0B1C2C]">
      <span className="mb-0.5 block text-[11px] font-medium text-brand">
        {t('reading.textFrom', { phone: fmtPhone(a.sourcePhone) })}
      </span>
      {a.message}
    </p>
  )
  if (!r) return texted || null
  const facts = [
    r.vendor ?? r.payee,
    r.date && fmtDay(r.date),
    a.total != null && money(a.total),
    r.tax != null && t('reading.tax', { amount: money(r.tax) }),
    r.checkNumber && t('reading.cheque', { number: r.checkNumber }),
  ].filter(Boolean)
  return (
    <div className="flex flex-col gap-2 text-sm">
      {texted}
      {r.summary && <p className="text-[#0B1C2C]">{r.summary}</p>}
      {facts.length > 0 && <p className="font-medium text-[#0B1C2C]">{facts.join(' · ')}</p>}
      {r.kind === 'CHECK' && r.payee && (
        <p className="text-muted-foreground">
          <Trans
            t={t}
            i18nKey="reading.payTo"
            values={{ payee: r.payee }}
            components={{ b: <span className="font-medium text-[#0B1C2C]" /> }}
          />
          {r.category && <> · {t('reading.assumedCategory', { category: r.category })}</>}
        </p>
      )}
      {r.memo && <p className="text-muted-foreground">{t('reading.memo', { memo: r.memo })}</p>}
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
      {r.transcript && <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground italic">{t('columnsDialog.quoted', { value: r.transcript })}</p>}
    </div>
  )
}
