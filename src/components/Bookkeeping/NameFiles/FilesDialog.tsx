import { useRef, useState, type DragEvent } from 'react'
import {
  ChevronRight,
  CreditCard,
  FileText,
  Folder,
  FolderPlus,
  Inbox,
  Landmark,
  Loader2,
  Paperclip,
  Pencil,
  Trash2,
} from 'lucide-react'
import {
  ATTACHMENT_ACCEPT,
  isAcceptedAttachment,
  MAX_ATTACHMENT_BYTES,
  type Attachment,
} from '@/api/attachments'
import { unreadable } from '@/api/bookkeeping'
import { RereadAllFiles } from './RereadAllFiles'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useAttachmentActions, useAttachments, useUploadAttachments } from '@/hooks/useAttachments'
import { useClosingValue } from '@/hooks/useClosingValue'
import { useNameFolderActions, useNameFolders } from '@/hooks/useNameFiles'
import { fmtDay } from '@/lib/attachment-labels'
import {
  BUCKET_LABEL,
  countsByName,
  EMPTY_COUNTS,
  filesIn,
  filesOfBucket,
  folderPath,
  nameKey,
  subfoldersIn,
  UNSORTED,
  type AccountEntry,
  type BucketFilter,
} from '@/lib/name-files'
import { cn } from '@/lib/utils'
import { TransactionPicker } from '../TransactionPicker'
import { CountPills } from './FileCounts'
import { EmailDialog } from './EmailDialog'
import { FileRow } from './FileRow'
import { MoveFileDialog } from './MoveFileDialog'

type Bucket = Exclude<BucketFilter, null>

/** What the files window shows. */
export type FilesTarget =
  /** A name's folder ('' = Unsorted), maybe opened on one of its three lists. */
  | { kind: 'name'; name: string; filter?: BucketFilter }
  /** A bank / card account: its statements (and any files filed under its name). */
  | { kind: 'account'; account: AccountEntry }
  /** One of the three lists across the whole book (the paperclip button). */
  | { kind: 'bucket'; bucket: Bucket }

/**
 * step2 (2026-11-11): the files window of the Names tab and of the paperclip button — a
 * name's folder (subfolders, files newest first, the three lists, add files here), a bank
 * account's statements (click one for its transactions), or one list across the whole book.
 */
export function FilesDialog({
  target,
  onOpenChange,
  onViewTransaction,
  onOpenStatement,
}: {
  target: FilesTarget | null
  onOpenChange: (open: boolean) => void
  onViewTransaction?: (transactionId: number) => void
  onOpenStatement?: (statementId: number) => void
}) {
  const shown = useClosingValue(target)
  const key =
    shown?.kind === 'name'
      ? `n:${shown.name}:${shown.filter ?? ''}`
      : shown?.kind === 'account'
        ? `a:${shown.account.name}`
        : `b:${shown?.bucket ?? ''}`
  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] flex-col gap-4 sm:max-w-3xl">
        {shown && (
          <Body
            key={key}
            target={shown}
            onViewTransaction={
              onViewTransaction &&
              ((id) => {
                onOpenChange(false)
                onViewTransaction(id)
              })
            }
            onOpenStatement={
              onOpenStatement &&
              ((id) => {
                onOpenChange(false)
                onOpenStatement(id)
              })
            }
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Body({
  target,
  onViewTransaction,
  onOpenStatement,
}: {
  target: FilesTarget
  onViewTransaction?: (transactionId: number) => void
  onOpenStatement?: (statementId: number) => void
}) {
  const attachments = useAttachments()
  const folders = useNameFolders()
  const { attach } = useAttachmentActions()
  const files = attachments.data ?? []
  const [picking, setPicking] = useState<Attachment | null>(null)
  const [moving, setMoving] = useState<Attachment | null>(null)
  const [emailOf, setEmailOf] = useState<number | null>(null)
  const [focus, setFocus] = useState<number | null>(null)

  // The name this window is about ('' = Unsorted); null = the whole book (a bucket list).
  const name = target.kind === 'name' ? target.name : target.kind === 'account' ? target.account.name : null
  const key = name === null ? null : name ? nameKey(name) : UNSORTED
  const [filter, setFilter] = useState<BucketFilter>(
    target.kind === 'name' ? (target.filter ?? null) : target.kind === 'bucket' ? target.bucket : null,
  )
  const [folderId, setFolderId] = useState<number | null>(null)
  const isName = target.kind === 'name'
  const counts = key === null ? null : (countsByName(files).get(key) ?? EMPTY_COUNTS)

  const list =
    key === null
      ? filesOfBucket(files, null, filter ?? 'ERROR')
      : filter
        ? filesOfBucket(files, key, filter)
        : filesIn(files, key, folderId)
  const subfolders = key !== null && !filter ? subfoldersIn(folders.data ?? [], key, folderId) : []
  const path = folderPath(folders.data ?? [], folderId)

  const title =
    target.kind === 'bucket'
      ? BUCKET_LABEL[target.bucket]
      : target.kind === 'account'
        ? target.account.name
        : name || 'Unsorted'
  const Icon = target.kind === 'account' ? (target.account.card ? CreditCard : Landmark) : key === UNSORTED ? Inbox : Folder

  const row = (a: Attachment) => (
    <FileRow
      key={a.id}
      a={a}
      showName={key === null}
      defaultOpen={focus === a.id || (key === null && filter === 'ERROR' && list.length === 1)}
      onViewTransaction={onViewTransaction}
      onPick={setPicking}
      onEmail={(f) => setEmailOf(f.id)}
      onMove={setMoving}
    />
  )

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 pr-6">
          <Icon className="size-5 shrink-0 text-brand" />
          <span className="truncate">{title}</span>
          {counts && <CountPills counts={counts} onPick={(b) => (setFilter(b), setFolderId(null))} />}
        </DialogTitle>
        <DialogDescription>
          {target.kind === 'bucket'
            ? target.bucket === 'ERROR'
              ? 'Files we could not link to a transaction, could not read, or could not tell who they are from. Open one to choose its transaction, move it to a name, or ask the AI.'
              : target.bucket === 'RELATED'
                ? 'Every file linked to a transaction of your ledger.'
                : 'Contracts, letters and other files that are not a transaction — kept under their name.'
            : target.kind === 'account'
              ? 'The statements of this account — click one for its transactions.'
              : key === UNSORTED
                ? 'Files we could not file under a name yet. Move each to its name, or ask the AI about it.'
                : 'Everything about this name, newest first. Add files here — we still find the transaction each belongs to.'}
        </DialogDescription>
        {/* "Read all again" where the unrecognised files are: the error list and Unsorted. */}
        {(filter === 'ERROR' || key === UNSORTED) && <RereadAllFiles files={list} />}
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {target.kind === 'account' && (
          <section className="flex flex-col gap-1.5">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Statements · {target.account.statements.length}
            </h3>
            <ul className="flex flex-col gap-1.5">
              {target.account.statements.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={!onOpenStatement || s.status !== 'DONE'}
                    onClick={() => onOpenStatement?.(s.id)}
                    className="flex w-full min-w-0 items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 text-left ring-1 ring-black/5 enabled:hover:bg-brand/5 disabled:cursor-default"
                    title={s.status === 'DONE' ? 'See the transactions of this statement' : undefined}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <FileText className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[#0B1C2C]">{s.label || s.filename}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {fmtDay(s.periodEnd)} ·{' '}
                        {s.status === 'DONE'
                          ? `${s.transactionCount} transaction${s.transactionCount === 1 ? '' : 's'}`
                          : unreadable(s)
                            ? (s.error ?? 'could not be read')
                            : 'not read yet'}
                      </span>
                    </span>
                    {s.status === 'DONE' && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {isName && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip active={filter === null} onClick={() => setFilter(null)}>
              All files
            </Chip>
            {(['RELATED', 'DOCUMENT', 'ERROR'] as const).map((b) => (
              <Chip key={b} active={filter === b} tone={b} onClick={() => (setFilter(b), setFolderId(null))}>
                {BUCKET_LABEL[b]}
              </Chip>
            ))}
          </div>
        )}

        {isName && !filter && (
          <Breadcrumb
            root={title}
            path={path.map((f) => ({ id: f.id, title: f.title }))}
            onGo={setFolderId}
          />
        )}

        {isName && !filter && (
          <Subfolders
            nameForApi={name || null}
            nameKey={key ?? UNSORTED}
            parentId={folderId}
            folders={subfolders}
            onOpen={setFolderId}
          />
        )}

        {attachments.isLoading ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : list.length ? (
          <ul className="flex flex-col gap-1.5">{list.map(row)}</ul>
        ) : (
          (target.kind !== 'account' || filter) && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {filter ? 'Nothing in this list.' : 'No files here yet.'}
            </p>
          )
        )}
        {attachments.error && <p className="text-sm text-destructive">{attachments.error.message}</p>}
      </div>

      {isName && <AddFiles name={name || null} folderId={filter ? null : folderId} />}

      <TransactionPicker
        attachment={picking}
        pending={attach.isPending}
        onOpenChange={(o) => !o && setPicking(null)}
        onPick={(transactionId) =>
          picking && attach.mutate({ id: picking.id, transactionId }, { onSuccess: () => setPicking(null) })
        }
      />
      <MoveFileDialog attachment={moving} onOpenChange={(o) => !o && setMoving(null)} />
      <EmailDialog
        attachmentId={emailOf}
        onOpenChange={(o) => !o && setEmailOf(null)}
        onOpenFile={(id) => {
          setEmailOf(null)
          setFilter(null)
          const f = files.find((x) => x.id === id)
          setFolderId(f?.folderId ?? null)
          setFocus(id)
        }}
      />
    </>
  )
}

function Chip({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean
  tone?: Bucket
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors',
        active
          ? tone === 'ERROR'
            ? 'bg-red-600 text-white ring-red-600'
            : tone === 'RELATED'
              ? 'bg-emerald-600 text-white ring-emerald-600'
              : 'bg-[#0B1C2C] text-white ring-[#0B1C2C]'
          : 'bg-white text-muted-foreground ring-black/10 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function Breadcrumb({
  root,
  path,
  onGo,
}: {
  root: string
  path: Array<{ id: number; title: string }>
  onGo: (id: number | null) => void
}) {
  if (!path.length) return null
  return (
    <nav aria-label="Folder" className="flex flex-wrap items-center gap-1 text-sm">
      <button type="button" onClick={() => onGo(null)} className="text-brand hover:underline">
        {root}
      </button>
      {path.map((f, i) => (
        <span key={f.id} className="flex items-center gap-1">
          <ChevronRight className="size-3.5 text-muted-foreground" />
          {i === path.length - 1 ? (
            <span className="font-medium text-[#0B1C2C]">{f.title}</span>
          ) : (
            <button type="button" onClick={() => onGo(f.id)} className="text-brand hover:underline">
              {f.title}
            </button>
          )}
        </span>
      ))}
    </nav>
  )
}

/** The subfolders at this level: open, rename, delete (its files move up) — and "New folder". */
function Subfolders({
  nameForApi,
  nameKey: key,
  parentId,
  folders,
  onOpen,
}: {
  nameForApi: string | null
  nameKey: string
  parentId: number | null
  folders: Array<{ id: number; title: string }>
  onOpen: (id: number) => void
}) {
  const { create, rename, remove } = useNameFolderActions()
  const [adding, setAdding] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: number; title: string } | null>(null)
  const error = create.error ?? rename.error ?? remove.error
  return (
    <div className="flex flex-col gap-1.5">
      {folders.map((f) =>
        editing?.id === f.id ? (
          <form
            key={f.id}
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (editing.title.trim())
                rename.mutate({ id: f.id, title: editing.title.trim() }, { onSuccess: () => setEditing(null) })
            }}
          >
            <Input
              autoFocus
              value={editing.title}
              maxLength={128}
              onChange={(e) => setEditing({ id: f.id, title: e.target.value })}
              className="h-8"
            />
            <Button type="submit" size="sm" disabled={rename.isPending}>
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </form>
        ) : (
          <div key={f.id} className="group flex items-center gap-1 rounded-xl bg-amber-50/60 ring-1 ring-amber-600/15">
            <button
              type="button"
              onClick={() => onOpen(f.id)}
              className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-[#0B1C2C]"
            >
              <Folder className="size-4 shrink-0 text-amber-600" />
              <span className="truncate">{f.title}</span>
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Rename this folder"
              onClick={() => setEditing({ id: f.id, title: f.title })}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Delete this folder (its files move up a level)"
              disabled={remove.isPending}
              onClick={() => remove.mutate(f.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 />
            </Button>
          </div>
        ),
      )}
      {adding !== null ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const title = adding.trim()
            if (title)
              create.mutate({ name: key ? nameForApi : null, parentId, title }, { onSuccess: () => setAdding(null) })
          }}
        >
          <Input
            autoFocus
            value={adding}
            maxLength={128}
            placeholder="Folder name, e.g. Contracts"
            onChange={(e) => setAdding(e.target.value)}
            className="h-8"
          />
          <Button type="submit" size="sm" disabled={create.isPending}>
            Create
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(null)}>
            Cancel
          </Button>
        </form>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setAdding('')} className="w-fit gap-1.5 text-muted-foreground">
          <FolderPlus className="size-4" /> New folder
        </Button>
      )}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  )
}

/** Drop or browse files into this folder — they are read and matched like any other. */
function AddFiles({ name, folderId }: { name: string | null; folderId: number | null }) {
  const input = useRef<HTMLInputElement>(null)
  const upload = useUploadAttachments()
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const accept = (list: FileList | null) => {
    const all = Array.from(list ?? [])
    if (!all.length || upload.isPending) return
    const ok = all.filter((f) => isAcceptedAttachment(f) && f.size <= MAX_ATTACHMENT_BYTES)
    const skipped = all.length - ok.length
    setNotice(skipped ? `Skipped ${skipped} file${skipped === 1 ? '' : 's'} (not a photo, PDF, audio or spreadsheet, or over 25 MB).` : null)
    if (ok.length) upload.mutate({ files: ok, place: { name, folderId } })
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    accept(e.dataTransfer.files)
  }

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t pt-3">
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
          'flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm transition-colors',
          dragging ? 'border-brand bg-brand/5' : 'border-black/10 hover:border-brand/60 hover:bg-brand/[0.03]',
        )}
      >
        {upload.isPending ? <Loader2 className="size-4 animate-spin text-brand" /> : <Paperclip className="size-4 text-brand" />}
        <span className="font-medium text-[#0B1C2C]">
          {upload.isPending ? 'Uploading…' : `Add files to ${name || 'Unsorted'}`}
        </span>
        <span className="hidden text-muted-foreground sm:inline">— drop them here or browse</span>
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
      {upload.error && <p className="text-sm text-destructive">{upload.error.message}</p>}
      {notice && <p className="text-sm text-amber-700">{notice}</p>}
    </div>
  )
}
