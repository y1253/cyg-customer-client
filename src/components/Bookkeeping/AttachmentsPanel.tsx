import { useRef, useState, type DragEvent } from 'react'
import { ChevronDown, ChevronRight, ExternalLink, Loader2, Paperclip, RotateCw, Search, Trash2 } from 'lucide-react'
import {
  ATTACHMENT_ACCEPT,
  isAcceptedAttachment,
  MAX_ATTACHMENT_BYTES,
  type Attachment,
} from '@/api/attachments'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useAttachmentActions, useAttachments, useUploadAttachments } from '@/hooks/useAttachments'
import { fmtDay, KIND_LABEL } from '@/lib/attachment-labels'
import { money } from '@/lib/money'
import { cn } from '@/lib/utils'
import { AttachmentPreview, AttachmentStatusBadge, KindIcon, ReadingSummary } from './AttachmentParts'
import { TextReceiptsCard } from './TextReceiptsCard'
import { TransactionPicker } from './TransactionPicker'

/**
 * Receipts, cheque photos and voice notes. The AI reads each one, finds the bank transaction
 * it belongs to and attaches it; a receipt's lines become that transaction's splits (in its
 * category, changeable per item). When it cannot tell, the customer chooses the transaction.
 */
export function AttachmentsPanel({ onViewTransaction }: { onViewTransaction: (transactionId: number) => void }) {
  const attachments = useAttachments()
  const { attach, retry, remove } = useAttachmentActions()
  const [picking, setPicking] = useState<Attachment | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const list = attachments.data ?? []
  const error = attach.error ?? retry.error ?? remove.error

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="lg:col-span-2">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Add</h2>
        <AttachmentDropzone />
        <p className="mt-3 text-sm text-muted-foreground">
          Photos of receipts or cheques, PDFs, or a voice note (“paid Home Depot $45 for lumber yesterday”). We find the
          transaction it belongs to — upload the bank statement first.
        </p>
        <TextReceiptsCard className="mt-4" />
      </section>
      <section className="lg:col-span-3">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Attachments {list.length > 0 && <span className="text-foreground">· {list.length}</span>}
        </h2>
        {error && <p className="mb-2 text-sm text-destructive">{error.message}</p>}
        {attachments.isLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : !list.length ? (
          <div className="rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-black/5">
            <p className="font-medium text-[#0B1C2C]">No attachments yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Add a receipt and it will be matched to its transaction.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((a) => {
              const expanded = open === a.id
              return (
                <li key={a.id} className="rounded-2xl bg-white ring-1 ring-black/5">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setOpen(expanded ? null : a.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      {expanded ? (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                        <KindIcon kind={a.kind} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[#0B1C2C]">
                          {[
                            a.reading?.vendor ?? a.reading?.payee ?? KIND_LABEL[a.kind],
                            a.total != null && money(a.total),
                            a.reading?.date && fmtDay(a.reading.date),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{subtitle(a)}</span>
                      </span>
                    </button>
                    {a.source === 'SMS' && (
                      <span className="shrink-0 rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-600/20">
                        via text
                      </span>
                    )}
                    {a.source === 'STATEMENT' && (
                      <span className="shrink-0 rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-600/20">
                        from statement
                      </span>
                    )}
                    <AttachmentStatusBadge a={a} />
                  </div>
                  {expanded && (
                    <div className="flex flex-col gap-3 border-t px-4 py-3">
                      <AttachmentPreview a={a} />
                      <ReadingSummary a={a} />
                      {a.matchNote && <p className="text-xs text-muted-foreground">{a.matchNote}</p>}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2">
                    {a.transaction ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewTransaction(a.transaction!.id)}
                        className="gap-1.5 text-brand"
                      >
                        <ExternalLink className="size-4" /> View transaction
                      </Button>
                    ) : null}
                    {(a.status === 'UNMATCHED' || a.status === 'MATCHED' || a.status === 'FAILED') && (
                      <Button size="sm" variant="ghost" onClick={() => setPicking(a)} className="gap-1.5">
                        <Search className="size-4" /> {a.transaction ? 'Change transaction' : 'Choose transaction'}
                      </Button>
                    )}
                    {(a.status === 'FAILED' || a.status === 'UNMATCHED') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={retry.isPending}
                        onClick={() => retry.mutate(a.id)}
                        className="gap-1.5"
                      >
                        <RotateCw className="size-4" /> Read again
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(a.id)}
                      className="ml-auto gap-1.5 text-muted-foreground hover:text-destructive"
                      title="Delete this attachment (splits made from it stay)"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <TransactionPicker
        attachment={picking}
        pending={attach.isPending}
        onOpenChange={(o) => !o && setPicking(null)}
        onPick={(transactionId) =>
          picking && attach.mutate({ id: picking.id, transactionId }, { onSuccess: () => setPicking(null) })
        }
      />
    </div>
  )
}

/** The second line: where it went, or what is happening to it. */
function subtitle(a: Attachment): string {
  if (a.status === 'FAILED') return a.error ?? 'We could not read this file.'
  if (a.status === 'PENDING' || a.status === 'PROCESSING') return `${a.filename} · reading…`
  if (a.transaction) {
    const t = a.transaction
    const split = t.splitCount ? ` · split into ${t.splitCount}` : ''
    return `→ ${t.name ?? t.description} · ${money(t.amount)} · ${fmtDay(t.date)}${split}`
  }
  return a.matchNote ?? a.filename
}

/** Drag-and-drop (or browse) receipts, cheque photos, PDFs and voice notes. */
function AttachmentDropzone() {
  const input = useRef<HTMLInputElement>(null)
  const upload = useUploadAttachments()
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  function accept(list: FileList | null) {
    const files = Array.from(list ?? [])
    if (!files.length || upload.isPending) return
    const heic = files.filter((f) => /\.hei[cf]$/i.test(f.name))
    const wrong = files.filter((f) => !isAcceptedAttachment(f) && !heic.includes(f))
    const tooBig = files.filter((f) => isAcceptedAttachment(f) && f.size > MAX_ATTACHMENT_BYTES)
    const ok = files.filter((f) => isAcceptedAttachment(f) && f.size <= MAX_ATTACHMENT_BYTES)
    const skipped = [
      heic.length && `${heic.length} iPhone HEIC photo${heic.length === 1 ? '' : 's'} (save as JPG)`,
      wrong.length && `${wrong.length} unsupported file${wrong.length === 1 ? '' : 's'}`,
      tooBig.length && `${tooBig.length} over 25 MB`,
    ].filter(Boolean)
    setNotice(skipped.length ? `Skipped ${skipped.join(' and ')}.` : null)
    if (ok.length) upload.mutate({ files: ok })
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    accept(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={upload.isPending}
        className={cn(
          'group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors outline-none',
          'focus-visible:ring-3 focus-visible:ring-brand/40',
          dragging ? 'border-brand bg-brand/5' : 'border-black/10 bg-white hover:border-brand/60 hover:bg-brand/[0.03]',
          upload.isPending && 'cursor-wait',
        )}
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand transition-transform group-hover:scale-105">
          {upload.isPending ? <Loader2 className="size-7 animate-spin" /> : <Paperclip className="size-7" />}
        </span>
        <div>
          <p className="text-base font-semibold text-[#0B1C2C]">
            {upload.isPending ? 'Uploading…' : 'Drop receipts, cheques or voice notes'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or <span className="font-medium text-brand underline-offset-4 group-hover:underline">browse your files</span>{' '}
            — photo, PDF or audio
          </p>
        </div>
      </button>
      <input
        ref={input}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          accept(e.target.files)
          e.target.value = ''
        }}
      />
      {upload.isPending && <Progress value={Math.round(upload.progress * 100)} className="h-1.5" />}
      {upload.error && (
        <p role="alert" className="text-sm text-destructive">
          {upload.error.message}
        </p>
      )}
      {notice && <p className="text-sm text-amber-700">{notice}</p>}
    </div>
  )
}
