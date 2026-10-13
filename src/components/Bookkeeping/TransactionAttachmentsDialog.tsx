import { useRef } from 'react'
import { Link2Off, ListChecks, Loader2, Paperclip } from 'lucide-react'
import { ATTACHMENT_ACCEPT, isAcceptedAttachment, MAX_ATTACHMENT_BYTES } from '@/api/attachments'
import type { LedgerTransaction } from '@/api/bookkeeping'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { useAttachmentActions, useAttachments, useUploadAttachments } from '@/hooks/useAttachments'
import { KIND_LABEL } from '@/lib/attachment-labels'
import { money } from '@/lib/money'
import { AttachmentPreview, AttachmentStatusBadge, KindIcon, ReadingSummary } from './AttachmentParts'

/**
 * A transaction's receipts, cheques and voice notes, from the paperclip in the ledger:
 * each file with what was read off it, "Use receipt items" to split the transaction by the
 * receipt's lines, "Remove" to take it off this transaction, and "Add a file".
 */
export function TransactionAttachmentsDialog({
  transaction,
  onOpenChange,
}: {
  transaction: LedgerTransaction | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!transaction} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-2xl">
        {transaction && <Body key={transaction.id} transaction={transaction} />}
      </DialogContent>
    </Dialog>
  )
}

function Body({ transaction }: { transaction: LedgerTransaction }) {
  const input = useRef<HTMLInputElement>(null)
  const attachments = useAttachments()
  const upload = useUploadAttachments()
  const { attach, applyItems } = useAttachmentActions()
  const mine = (attachments.data ?? []).filter((a) => a.transaction?.id === transaction.id)

  const add = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((f) => isAcceptedAttachment(f) && f.size <= MAX_ATTACHMENT_BYTES)
    if (files.length) upload.mutate({ files, transactionId: transaction.id })
  }
  const error = upload.error ?? attach.error ?? applyItems.error

  return (
    <>
      <DialogHeader>
        <DialogTitle>Attachments · {transaction.name ?? transaction.description}</DialogTitle>
        <DialogDescription>
          “{transaction.description}” — {money(transaction.amount)}
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {attachments.isLoading && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
        {!attachments.isLoading && !mine.length && (
          <p className="text-sm text-muted-foreground">No receipts or files on this transaction yet.</p>
        )}
        {mine.map((a) => {
          const canSplit = a.kind === 'RECEIPT' && (a.reading?.items.length ?? 0) > 0
          return (
            <div key={a.id} className="flex flex-col gap-3 rounded-xl bg-muted/30 p-3 ring-1 ring-black/5">
              <div className="flex items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <KindIcon kind={a.kind} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#0B1C2C]">{KIND_LABEL[a.kind]}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.filename}</p>
                </div>
                <AttachmentStatusBadge a={a} />
              </div>
              <AttachmentPreview a={a} />
              <ReadingSummary a={a} />
              {a.matchNote && <p className="text-xs text-muted-foreground">{a.matchNote}</p>}
              <div className="flex flex-wrap gap-2">
                {canSplit && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={applyItems.isPending}
                    onClick={() => applyItems.mutate(a.id)}
                    className="gap-1.5"
                    title="Replace this transaction's splits with one split per receipt line"
                  >
                    <ListChecks className="size-4" /> Use receipt items
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={attach.isPending}
                  onClick={() => attach.mutate({ id: a.id, transactionId: null })}
                  className="gap-1.5 text-muted-foreground"
                  title="Take this file off the transaction (its splits stay)"
                >
                  <Link2Off className="size-4" /> Remove from transaction
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {upload.isPending && <Progress value={Math.round(upload.progress * 100)} className="h-1.5" />}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      <div className="flex justify-end">
        <Button
          onClick={() => input.current?.click()}
          disabled={upload.isPending}
          className="gap-1.5 bg-brand text-white hover:bg-brand/85"
        >
          {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
          Add a file
        </Button>
        <input
          ref={input}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            add(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
    </>
  )
}
