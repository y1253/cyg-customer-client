import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FolderInput,
  Mail,
  MessagesSquare,
  Pencil,
  RotateCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import type { Attachment } from '@/api/attachments'
import { openOriginal } from '@/api/bookkeeping'
import { AttachmentChat } from '@/components/Assistant/AttachmentChat'
import { AttachmentConversation } from '@/components/Assistant/AttachmentConversation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAssistantEnabled } from '@/hooks/useAssistant'
import { useAttachmentActions } from '@/hooks/useAttachments'
import { useBook } from '@/hooks/useBook'
import { usePlaceAttachment } from '@/hooks/useNameFiles'
import { fmtDay, kindLabel } from '@/lib/attachment-labels'
import { money } from '@/lib/money'
import { fileDate, fileTitle } from '@/lib/name-files'
import { cn } from '@/lib/utils'
import { AttachmentPreview, AttachmentStatusBadge, KindIcon, ReadingSummary } from '../AttachmentParts'

/** A source's badge: its label key (`ledger:files.source.<key>`) and colours. */
const SOURCE_BADGE: Partial<Record<Attachment['source'], ['SMS' | 'WHATSAPP' | 'EMAIL' | 'STATEMENT' | 'CHAT', string]>> = {
  SMS: ['SMS', 'bg-sky-50 text-sky-700 ring-sky-600/20'],
  WHATSAPP: ['WHATSAPP', 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'],
  EMAIL: ['EMAIL', 'bg-indigo-50 text-indigo-700 ring-indigo-600/20'],
  STATEMENT: ['STATEMENT', 'bg-violet-50 text-violet-700 ring-violet-600/20'],
  CHAT: ['CHAT', 'bg-brand/10 text-brand ring-brand/25'],
}

/**
 * step2 (2026-11-11): one file in a Names-tab folder. Click to open it: the file, what was
 * read, and everything that can be done with it — its transaction, choose one, the AI chat
 * (with "Call me" inside it), the email it came in, rename, move, read again, delete.
 */
export function FileRow({
  a,
  showName = false,
  onViewTransaction,
  onPick,
  onEmail,
  onMove,
  defaultOpen = false,
}: {
  a: Attachment
  /** Listed across names (the paperclip's lists): say which name it sits under. */
  showName?: boolean
  onViewTransaction?: (transactionId: number) => void
  onPick: (a: Attachment) => void
  onEmail: (a: Attachment) => void
  onMove: (a: Attachment) => void
  defaultOpen?: boolean
}) {
  const { t } = useTranslation(['ledger', 'common'])
  const [open, setOpen] = useState(defaultOpen)
  const [asking, setAsking] = useState(defaultOpen && a.bucket === 'ERROR')
  const [renaming, setRenaming] = useState<string | null>(null)
  const assistant = useAssistantEnabled()
  const { retry, remove } = useAttachmentActions()
  const place = usePlaceAttachment()
  const busy = a.status === 'PENDING' || a.status === 'PROCESSING'
  const amount = a.total ?? (a.transaction ? Math.abs(a.transaction.amount) : null)
  const badge = SOURCE_BADGE[a.source]
  const book = useBook()
  const [openError, setOpenError] = useState<string | null>(null)
  const error = retry.error ?? remove.error ?? place.error ?? (openError ? new Error(openError) : null)

  const saveName = () => {
    if (renaming === null) return
    const next = renaming.trim()
    if (next === (a.displayName ?? '')) return setRenaming(null)
    place.mutate({ id: a.id, displayName: next }, { onSuccess: () => setRenaming(null) })
  }

  return (
    <li className={cn('rounded-xl ring-1 ring-black/5', a.bucket === 'ERROR' ? 'bg-red-50/40' : 'bg-white')}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen(!open))}
        className="flex min-w-0 cursor-pointer items-center gap-2.5 px-3 py-2.5"
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <KindIcon kind={a.kind} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-[#0B1C2C]">{fileTitle(a)}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {fmtDay(fileDate(a))} · {kindLabel(a.kind)}
            {showName && ` · ${a.name ?? t('files.unsorted')}`}
            {a.transaction && ` · → ${a.transaction.name ?? a.transaction.description}`}
          </span>
        </span>
        {badge &&
          (a.fromStatementId ? (
            // step8 (2026-11-11, `check.png`): a cheque cut from a statement opens that statement.
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpenError(null)
                openOriginal(book.auth, a.fromStatementId!).catch((err: Error) => {
                  setOpenError(err.message)
                  setOpen(true)
                })
              }}
              onKeyDown={(e) => e.stopPropagation()}
              title={t('files.openStatement')}
              className={cn(
                'hidden shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 hover:underline sm:inline',
                badge[1],
              )}
            >
              {t(`files.source.${badge[0]}`)}
            </button>
          ) : (
            <span
              className={cn(
                'hidden shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 sm:inline',
                badge[1],
              )}
            >
              {t(`files.source.${badge[0]}`)}
            </span>
          ))}
        {!!a.messageCount && (
          <span
            title={t('files.messages', { count: a.messageCount })}
            className="flex shrink-0 items-center gap-0.5 rounded-md bg-brand/10 px-1.5 py-0.5 text-[11px] font-medium text-brand"
          >
            <MessagesSquare className="size-3" /> {a.messageCount}
          </span>
        )}
        {amount !== null && <span className="hidden shrink-0 text-sm tabular-nums sm:inline">{money(amount)}</span>}
        {a.name === null && !busy ? (
          <span className="shrink-0 rounded-md bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
            {t('files.noName')}
          </span>
        ) : (
          <AttachmentStatusBadge a={a} />
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-3 border-t px-3 py-3">
          {renaming !== null ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                saveName()
              }}
            >
              <Input
                autoFocus
                value={renaming}
                maxLength={255}
                onChange={(e) => setRenaming(e.target.value)}
                placeholder={a.reading?.summary ?? a.filename}
                className="h-8"
              />
              <Button type="submit" size="icon-sm" disabled={place.isPending} title={t('files.saveName')}>
                <Check />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setRenaming(null)} title={t('common:actions.cancel')}>
                <X />
              </Button>
            </form>
          ) : (
            a.displayName && <p className="text-xs text-muted-foreground">{t('files.file', { name: a.filename })}</p>
          )}
          <AttachmentPreview a={a} />
          <ReadingSummary a={a} />
          {a.matchNote && a.matchNote !== a.reading?.summary && (
            <p className="text-xs text-muted-foreground">{a.matchNote}</p>
          )}
          {a.name === null && !busy && (
            <p className="text-xs text-red-700">
              {t('files.whoFrom')}
            </p>
          )}
          {asking ? (
            <AttachmentChat attachmentId={a.id} />
          ) : (
            !!a.messageCount && <AttachmentConversation attachmentId={a.id} />
          )}
          {error && <p className="text-sm text-destructive">{error.message}</p>}
          <div className="flex flex-wrap items-center gap-1.5">
            {a.transaction && onViewTransaction && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onViewTransaction(a.transaction!.id)}
                className="gap-1.5 text-brand"
              >
                <ExternalLink className="size-4" /> {t('files.viewTransaction')}
              </Button>
            )}
            {!busy && (
              <Button size="sm" variant="ghost" onClick={() => onPick(a)} className="gap-1.5">
                <Search className="size-4" /> {a.transaction ? t('files.changeTransaction') : t('status.choose')}
              </Button>
            )}
            {assistant && !busy && (
              <Button
                size="sm"
                variant={asking ? 'secondary' : 'ghost'}
                onClick={() => setAsking(!asking)}
                className="gap-1.5 text-brand"
                title={t('files.askTitle')}
              >
                <Sparkles className="size-4" /> {asking ? t('attachments.hideAi') : t('files.ask')}
              </Button>
            )}
            {a.hasEmail && (
              <Button size="sm" variant="ghost" onClick={() => onEmail(a)} className="gap-1.5">
                <Mail className="size-4" /> {t('files.viewEmail')}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setRenaming(a.displayName ?? '')} className="gap-1.5">
              <Pencil className="size-4" /> {t('common:actions.rename')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onMove(a)} className="gap-1.5">
              <FolderInput className="size-4" /> {t('move.move')}
            </Button>
            {(a.status === 'FAILED' || a.status === 'UNMATCHED' || a.status === 'DOCUMENT') && (
              <Button
                size="sm"
                variant="ghost"
                disabled={retry.isPending}
                onClick={() => retry.mutate(a.id)}
                className="gap-1.5"
              >
                <RotateCw className="size-4" /> {t('files.readAgain')}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              disabled={remove.isPending}
              onClick={() => remove.mutate(a.id)}
              className="ml-auto gap-1.5 text-muted-foreground hover:text-destructive"
              title={t('files.deleteTitle')}
            >
              <Trash2 className="size-4" /> {t('common:actions.delete')}
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}
