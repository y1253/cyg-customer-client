import { Fragment, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  ChevronDown,
  ChevronRight,
  CreditCard,
  ExternalLink,
  FileText,
  Folder,
  FolderOpen,
  Inbox,
  Loader2,
  MessagesSquare,
  Paperclip,
  RotateCw,
  Search,
  Sparkles,
  Store,
  Trash2,
} from 'lucide-react'
import {
  ATTACHMENT_ACCEPT,
  isAcceptedAttachment,
  MAX_ATTACHMENT_BYTES,
  type Attachment,
} from '@/api/attachments'
import { openOriginal, UNCLARIFIED_NAME, type Statement } from '@/api/bookkeeping'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { useAttachmentActions, useAttachments, useUploadAttachments } from '@/hooks/useAttachments'
import { useBookScope } from '@/context/BookScopeContext'
import { AttachmentChat } from '@/components/Assistant/AttachmentChat'
import { AttachmentConversation } from '@/components/Assistant/AttachmentConversation'
import { useAssistantEnabled } from '@/hooks/useAssistant'
import { useBook } from '@/hooks/useBook'
import {
  FILE_COLUMNS,
  fileFolders,
  fileFoldersByName,
  fileSize,
  folderItems,
  itemAmount,
  itemDate,
  itemName,
  itemSize,
  itemType,
  type FileFolder,
} from '@/lib/attachment-folders'
import { fmtDay } from '@/lib/attachment-labels'
import { applyTable, useTableControls } from '@/lib/table-sort'
import { money } from '@/lib/money'
import { cn } from '@/lib/utils'
import { AttachmentPreview, AttachmentStatusBadge, KindIcon, ReadingSummary } from './AttachmentParts'
import { ColumnHeader } from './ColumnHeader'
import { TextReceiptsCard } from './TextReceiptsCard'
import { TransactionPicker } from './TransactionPicker'

type Grouping = 'account' | 'name'
const GROUPING_KEY = 'attachments-group'

function readGrouping(): Grouping {
  try {
    return localStorage.getItem(GROUPING_KEY) === 'name' ? 'name' : 'account'
  } catch {
    return 'account'
  }
}

/**
 * Everything filed for this book (step8): bank statements, receipts, cheque photos and voice
 * notes, in ONE folder per bank / card account, plus "Not filed yet". The "By name" view
 * (step9) files the attachments by payee instead — every Walmart receipt in "Walmart". The AI reads each
 * attachment, finds the bank transaction it belongs to and attaches it — so it lands in that
 * account's folder; a receipt's lines become that transaction's splits. When it cannot tell,
 * the customer chooses the transaction. Inside a folder every column sorts and filters.
 */
export function AttachmentsPanel({
  statements,
  onViewTransaction,
}: {
  statements: Statement[]
  onViewTransaction: (transactionId: number) => void
}) {
  const attachments = useAttachments()
  const { attach } = useAttachmentActions()
  // Texted receipts are filed by phone number, which names a customer, never a business —
  // so they always land in the general book, and a business's books do not offer it.
  // Texted receipts land in the customer's bookkeeping companies, never a business's book.
  const generalBook = useBookScope().companyId === null
  const [picking, setPicking] = useState<Attachment | null>(null)
  const list = attachments.data
  const [grouping, setGroupingState] = useState<Grouping>(readGrouping)
  const setGrouping = (g: Grouping) => {
    setGroupingState(g)
    try {
      localStorage.setItem(GROUPING_KEY, g)
    } catch {
      // A private window: the choice just is not remembered.
    }
  }
  const folders = useMemo(
    () =>
      grouping === 'name'
        ? fileFoldersByName(list ?? [], UNCLARIFIED_NAME)
        : fileFolders(statements, list ?? []),
    [grouping, statements, list],
  )
  const [chosen, setChosen] = useState<string | null>(null)
  // The chosen folder, else the first — a folder that emptied falls back by itself.
  const folder = folders.find((f) => f.key === chosen) ?? folders[0] ?? null

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 lg:grid-cols-5">
        <section className={generalBook ? 'lg:col-span-3' : 'lg:col-span-5'}>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Add</h2>
          <AttachmentDropzone />
          <p className="mt-3 text-sm text-muted-foreground">
            Photos of receipts or cheques, PDFs, or a voice note (“paid Home Depot $45 for lumber yesterday”). We find the
            transaction it belongs to and file it in that bank account’s folder (or, by name, under who you paid) —
            upload the bank statement first.
          </p>
        </section>
        {generalBook && <TextReceiptsCard className="lg:col-span-2 lg:mt-8" />}
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Folders {folders.length > 0 && <span className="text-foreground">· {folders.length}</span>}
          </h2>
          <div role="group" aria-label="Group files" className="ml-auto inline-flex rounded-lg bg-muted p-0.5 text-xs font-medium">
            {(
              [
                ['account', 'By account'],
                ['name', 'By name'],
              ] as const
            ).map(([g, label]) => (
              <button
                key={g}
                type="button"
                aria-pressed={grouping === g}
                onClick={() => setGrouping(g)}
                className={cn(
                  'rounded-md px-3 py-1 transition-colors',
                  grouping === g ? 'bg-white text-[#0B1C2C] shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {attachments.error && <p className="mb-2 text-sm text-destructive">{attachments.error.message}</p>}
        {attachments.isLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : !folder ? (
          <div className="rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-black/5">
            <p className="font-medium text-[#0B1C2C]">Nothing filed yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {grouping === 'name'
                ? 'Add a receipt — each payee gets its own folder.'
                : 'Upload a bank statement or add a receipt — each bank account gets its own folder.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
            <nav aria-label="Folders" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {folders.map((f) => {
                const active = f.key === folder.key
                const count = f.statements.length + f.attachments.length
                const Icon =
                  f.name === null
                    ? Inbox
                    : grouping === 'name'
                      ? Store
                      : f.card
                        ? CreditCard
                        : active
                          ? FolderOpen
                          : Folder
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setChosen(f.key)}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm ring-1 transition-colors',
                      active
                        ? 'bg-brand/10 font-semibold text-[#0B1C2C] ring-brand/30'
                        : 'bg-white text-muted-foreground ring-black/5 hover:text-foreground',
                    )}
                  >
                    <Icon className={cn('size-4 shrink-0', active && 'text-brand')} />
                    <span className="min-w-0 flex-1 truncate">{f.name ?? 'Not filed yet'}</span>
                    <span className="rounded-full bg-black/5 px-1.5 text-[11px] leading-[18px] font-medium">{count}</span>
                  </button>
                )
              })}
            </nav>
            <FolderTable key={folder.key} folder={folder} onViewTransaction={onViewTransaction} onPick={setPicking} />
          </div>
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

/** One folder's statements and attachments in a table whose every column sorts and filters. */
function FolderTable({
  folder,
  onViewTransaction,
  onPick,
}: {
  folder: FileFolder
  onViewTransaction: (transactionId: number) => void
  onPick: (a: Attachment) => void
}) {
  const { auth } = useBook()
  const { retry, remove, attach } = useAttachmentActions()
  const controls = useTableControls({ key: 'date', dir: 'desc' })
  const [open, setOpen] = useState<string | null>(null)
  // "Ask AI" about an attachment we could not file (step11); one chat open at a time.
  const [asking, setAsking] = useState<number | null>(null)
  const assistant = useAssistantEnabled()
  const [openError, setOpenError] = useState<string | null>(null)
  const rows = applyTable(folderItems(folder), FILE_COLUMNS, controls.filters, controls.sort)
  const error = attach.error ?? retry.error ?? remove.error

  return (
    <div className="min-w-0 rounded-2xl bg-white ring-1 ring-black/5">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <p className="min-w-0 flex-1 truncate font-semibold text-[#0B1C2C]">{folder.name ?? 'Not filed yet'}</p>
        <span className="text-xs text-muted-foreground">
          {folder.statements.length} statement{folder.statements.length === 1 ? '' : 's'} · {folder.attachments.length}{' '}
          attachment{folder.attachments.length === 1 ? '' : 's'}
        </span>
        {controls.activeCount > 0 && (
          <Button size="sm" variant="ghost" onClick={controls.clearFilters} className="h-7 text-muted-foreground">
            Clear filters
          </Button>
        )}
      </div>
      {(error || openError) && <p className="px-4 pt-3 text-sm text-destructive">{error?.message ?? openError}</p>}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <ColumnHeader column="name" label="Name" kind="text" controls={controls} />
            <ColumnHeader column="type" label="Type" kind="text" controls={controls} className="hidden w-28 md:table-cell" />
            <ColumnHeader column="date" label="Date" kind="date" controls={controls} className="w-28" />
            <ColumnHeader
              column="size"
              label="Size"
              kind="number"
              controls={controls}
              className="hidden w-20 sm:table-cell"
              align="end"
            />
            <ColumnHeader column="amount" label="Amount" kind="number" controls={controls} className="w-24" align="end" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {!rows.length && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                Nothing matches these filters.
              </TableCell>
            </TableRow>
          )}
          {rows.map((item) => {
            const expanded = open === item.key
            const amount = itemAmount(item)
            const a = item.type === 'attachment' ? item.attachment : null
            return (
              <Fragment key={item.key}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => {
                    if (item.type === 'statement') {
                      // A bank-feed month opens a PDF the server builds from its rows.
                      setOpenError(null)
                      openOriginal(auth, item.statement.id).catch((e: Error) => setOpenError(e.message))
                    } else setOpen(expanded ? null : item.key)
                  }}
                >
                  <TableCell className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {a ? (
                        expanded ? (
                          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        )
                      ) : (
                        <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                        {a ? <KindIcon kind={a.kind} /> : <FileText className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[#0B1C2C]">{itemName(item)}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {a ? subtitle(a) : item.type === 'statement' ? statementSubtitle(item.statement) : ''}
                        </span>
                      </span>
                      {a?.source === 'SMS' && (
                        <span className="hidden shrink-0 rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-600/20 sm:inline">
                          via text
                        </span>
                      )}
                      {a?.source === 'WHATSAPP' && (
                        <span className="hidden shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-600/20 sm:inline">
                          via WhatsApp
                        </span>
                      )}
                      {a?.source === 'STATEMENT' && (
                        <span className="hidden shrink-0 rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-600/20 sm:inline">
                          from statement
                        </span>
                      )}
                      {a?.source === 'EMAIL' && (
                        <span className="hidden shrink-0 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-600/20 sm:inline">
                          via email
                        </span>
                      )}
                      {a?.source === 'CHAT' && (
                        <span className="hidden shrink-0 rounded-md bg-brand/10 px-1.5 py-0.5 text-[11px] font-medium text-brand ring-1 ring-brand/25 sm:inline">
                          via AI chat
                        </span>
                      )}
                      {!!a?.messageCount && (
                        <span
                          title={`${a.messageCount} message${a.messageCount === 1 ? '' : 's'} with the AI about this file`}
                          className="flex shrink-0 items-center gap-0.5 rounded-md bg-brand/10 px-1.5 py-0.5 text-[11px] font-medium text-brand"
                        >
                          <MessagesSquare className="size-3" /> {a.messageCount}
                        </span>
                      )}
                      {a && <AttachmentStatusBadge a={a} />}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{itemType(item)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtDay(itemDate(item))}</TableCell>
                  <TableCell className="hidden text-right text-sm text-muted-foreground tabular-nums sm:table-cell">
                    {fileSize(itemSize(item))}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{amount === null ? '' : money(amount)}</TableCell>
                </TableRow>
                {a && expanded && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="bg-black/[0.015] whitespace-normal">
                      <div className="flex flex-col gap-3 py-1">
                        <AttachmentPreview a={a} />
                        <ReadingSummary a={a} />
                        {a.matchNote && a.matchNote !== a.reading?.summary && (
                          <p className="text-xs text-muted-foreground">{a.matchNote}</p>
                        )}
                        {asking === a.id ? (
                          <AttachmentChat attachmentId={a.id} />
                        ) : (
                          !!a.messageCount && <AttachmentConversation attachmentId={a.id} />
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          {a.transaction && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onViewTransaction(a.transaction!.id)}
                              className="gap-1.5 text-brand"
                            >
                              <ExternalLink className="size-4" /> View transaction
                            </Button>
                          )}
                          {(a.status === 'UNMATCHED' ||
                            a.status === 'MATCHED' ||
                            a.status === 'FAILED' ||
                            a.status === 'DOCUMENT') && (
                            <Button size="sm" variant="ghost" onClick={() => onPick(a)} className="gap-1.5">
                              <Search className="size-4" /> {a.transaction ? 'Change transaction' : 'Choose transaction'}
                            </Button>
                          )}
                          {assistant && (a.status === 'FAILED' || a.status === 'UNMATCHED' || a.status === 'DOCUMENT') && (
                            <Button
                              size="sm"
                              variant={asking === a.id ? 'secondary' : 'ghost'}
                              onClick={() => setAsking(asking === a.id ? null : a.id)}
                              className="gap-1.5 text-brand"
                            >
                              <Sparkles className="size-4" /> {asking === a.id ? 'Hide AI chat' : 'Ask AI'}
                            </Button>
                          )}
                          {(a.status === 'FAILED' || a.status === 'UNMATCHED' || a.status === 'DOCUMENT') && (
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
                            <Trash2 className="size-4" /> Delete
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

/** A statement row's second line: its file, and where reading stands. */
function statementSubtitle(s: Statement): string {
  const state =
    s.status === 'DONE'
      ? `${s.transactionCount} transaction${s.transactionCount === 1 ? '' : 's'}`
      : s.status === 'UPLOADED'
        ? 'not read yet — click Generate'
        : s.status === 'FAILED' || s.status === 'NEEDS_REVIEW'
          ? 'could not be read'
          : 'reading…'
  return `${s.filename} · ${state}`
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
