import { useState, type ReactNode } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Clock,
  CreditCard,
  ExternalLink,
  FileClock,
  FileText,
  Folder as Folder2,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Landmark,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { hasProblem, isBusy, openOriginal, rereadable, type Statement } from '@/api/bookkeeping'
import { Badge } from '@/components/ui/badge'
import { useCurrency } from '@/hooks/useCurrency'
import { AccountCurrency } from './AccountCurrency'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useBook } from '@/hooks/useBook'
import { useDeleteStatement } from '@/hooks/useDeleteStatement'
import { useRenameAccount } from '@/hooks/useMerge'
import { useMoveStatement } from '@/hooks/useMoveStatement'
import { useRetryProblemStatements, useRetryStatement } from '@/hooks/useRetryStatement'
import { cn } from '@/lib/utils'
import { statementHelp } from '@/lib/statement-errors'
import { StatementChat } from '@/components/Assistant/StatementChat'
import { useAssistantEnabled } from '@/hooks/useAssistant'
import { InlineRename } from './InlineRename'
import { statementDragProps, useFolderDrop } from './statement-drag'
import {
  balanceLine,
  folderKey,
  folderOf,
  groupByAccount,
  isFiled,
  startsByFolder,
  type StatementFolder,
} from './statement-folders'
import { STARTS_WARNING, startingNote, type StartingDate } from '@/lib/starting-dates'

// The check against the bank's own totals happens on the server and is kept there; the
// customer only sees the outcome — Done, or Needs review with the reason.
function StatusBadge({ s }: { s: Statement }) {
  // step2: a problem is named instead of "Done" / "Needs review".
  if (s.problem) {
    const soft = s.problem.kind === 'NO_BALANCES'
    return (
      <Badge
        className={cn(
          'gap-1 ring-1',
          soft ? 'bg-amber-50 text-amber-800 ring-amber-600/25' : 'bg-red-50 text-red-700 ring-red-600/20',
        )}
      >
        {soft ? <AlertTriangle className="size-3" /> : <AlertCircle className="size-3" />} {s.problem.title}
      </Badge>
    )
  }
  if (s.status === 'DONE') {
    return (
      <Badge className="gap-1 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
        <CheckCircle2 className="size-3" /> Done
      </Badge>
    )
  }
  if (s.status === 'NEEDS_REVIEW') {
    return (
      <Badge className="gap-1 bg-amber-50 text-amber-800 ring-1 ring-amber-600/25">
        <AlertTriangle className="size-3" /> Needs review
      </Badge>
    )
  }
  if (s.status === 'FAILED') {
    return (
      <Badge className="gap-1 bg-red-50 text-red-700 ring-1 ring-red-600/20">
        <AlertCircle className="size-3" /> Failed
      </Badge>
    )
  }
  if (s.status === 'UPLOADED') {
    return (
      <Badge className="gap-1 bg-slate-100 text-slate-600 ring-1 ring-slate-500/15">
        <FileClock className="size-3" /> Not read yet
      </Badge>
    )
  }
  if (s.status === 'PROCESSING') {
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

/** The second line under a statement: what it is, or what is happening to it. */
function subtitle(s: Statement, home?: string): string {
  if (s.problem) return s.problem.text
  switch (s.status) {
    case 'FAILED':
      return s.error ?? 'We could not read this statement.'
    case 'NEEDS_REVIEW':
      return s.error ?? "This statement doesn't match the bank's totals."
    case 'DONE':
      return [
        `${s.transactionCount} transactions`,
        // A foreign statement says which currency its amounts are in.
        home && s.accountCurrency && s.accountCurrency !== home ? `in ${s.accountCurrency}` : null,
        s.filename,
      ]
        .filter(Boolean)
        .join(' · ')
    case 'PROCESSING':
      return 'Reading every transaction…'
    case 'UPLOADED':
      return [s.filename, 'click Generate to read it'].join(' · ')
    default:
      return 'Waiting to be read…'
  }
}


type Filter = 'all' | 'done' | 'unread' | 'waiting'
const FILTERS: Array<{ id: Filter; label: string; test: (s: Statement) => boolean }> = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'done', label: 'Done', test: (s) => s.status === 'DONE' },
  { id: 'unread', label: 'Problems', test: hasProblem },
  { id: 'waiting', label: 'Waiting', test: (s) => s.status === 'UPLOADED' || isBusy(s) },
]

const day = (iso: string) =>
  new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', year: 'numeric' })

function folderRange(f: StatementFolder): string | null {
  if (!f.from && !f.to) return null
  const a = f.from ? day(f.from) : null
  const b = f.to ? day(f.to) : null
  return a && b && a !== b ? `${a} – ${b}` : (b ?? a)
}

/**
 * Every uploaded statement, filed in one folder per bank / card account. When a statement
 * landed in the wrong account, drag it onto the right folder (or use its Move menu) and it
 * is that account's statement from then on — its rows, balances and reports follow, and
 * Try again keeps it there. The chips narrow the statements down by status.
 */
export function StatementsList({
  statements,
  loading,
  onOpenInLedger,
}: {
  statements: Statement[]
  loading: boolean
  /** step8 (2026-11-11): a read statement's name opens its transactions on the Ledger tab. */
  onOpenInLedger?: (statementId: number) => void
}) {
  const { auth } = useBook()
  const [filter, setFilter] = useState<Filter>('all')
  const remove = useDeleteStatement()
  const retry = useRetryStatement()
  // "Re-read all" under Problems: confirm first, then say how many went back to reading.
  const retryAll = useRetryProblemStatements()
  const [confirmAll, setConfirmAll] = useState(false)
  const [allNote, setAllNote] = useState<string | null>(null)
  const move = useMoveStatement()
  const rename = useRenameAccount()
  const [confirm, setConfirm] = useState<Statement | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const [newFor, setNewFor] = useState<Statement | null>(null)
  const [newName, setNewName] = useState('')
  // step8: one "Ask AI" chat / one "Details" open at a time, under its statement.
  const [asking, setAsking] = useState<number | null>(null)
  // step2: the chat opened from a folder's starting-dates warning starts with this text.
  const [askDraft, setAskDraft] = useState<string | undefined>(undefined)
  const [details, setDetails] = useState<number | null>(null)
  const ask = (id: number, draft?: string) => {
    setAskDraft(draft)
    setAsking(asking === id && !draft ? null : id)
  }
  const assistant = useAssistantEnabled()
  const home = useCurrency().data?.home

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[68px] rounded-xl" />
        ))}
      </div>
    )
  }

  if (!statements.length) {
    return (
      <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 bg-white/60 p-6 text-center">
        <FileText className="mb-2 size-7 text-muted-foreground/60" />
        <p className="text-sm font-medium text-[#0B1C2C]">No statements yet</p>
        <p className="text-sm text-muted-foreground">Uploaded statements appear here.</p>
      </div>
    )
  }

  const test = FILTERS.find((f) => f.id === filter)!.test
  const folders = groupByAccount(statements.filter(test))
  const accounts = groupByAccount(statements)
    .map((f) => f.account)
    .filter((a): a is string => a !== null)
  const starts = startsByFolder(statements)
  const anyOpen = folders.some((f) => !closed.has(folderKey(f)))
  const toReread = statements.filter(rereadable).length

  const moveTo = (id: number, accountName: string) => {
    const s = statements.find((x) => x.id === id)
    if (!s || !isFiled(s) || folderOf(s) === accountName) return
    move.mutate({ id, accountName })
  }
  const toggle = (key: string) =>
    setClosed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => {
          const n = statements.filter(f.test).length
          if (f.id !== 'all' && !n && filter !== f.id) return null
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors',
                filter === f.id
                  ? 'bg-[#0B1C2C] text-white'
                  : f.id === 'unread'
                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              )}
            >
              {f.label} · {n}
            </button>
          )
        })}
        {filter === 'unread' && toReread > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
            disabled={retryAll.isPending}
            onClick={() => setConfirmAll(true)}
          >
            {retryAll.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            Re-read all ({toReread})
          </Button>
        )}
        {folders.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-7 gap-1.5"
            onClick={() => setClosed(anyOpen ? new Set(folders.map(folderKey)) : new Set())}
          >
            {anyOpen ? <ChevronsDownUp className="size-4" /> : <ChevronsUpDown className="size-4" />}
            {anyOpen ? 'Collapse all' : 'Expand all'}
          </Button>
        )}
      </div>
      {accounts.length > 1 && (
        <p className="mb-2 text-xs text-muted-foreground">
          A statement in the wrong account? Drag it onto the right folder, or use its{' '}
          <FolderInput className="inline size-3.5" /> menu.
        </p>
      )}
      {move.error && <p className="mb-2 text-sm text-destructive">{move.error.message}</p>}
      {retryAll.error && <p className="mb-2 text-sm text-destructive">{retryAll.error.message}</p>}
      {allNote && <p className="mb-2 text-sm text-muted-foreground">{allNote}</p>}
      {!folders.length && (
        <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-black/5">
          Nothing here.
        </p>
      )}
      <div className="flex max-h-[34rem] flex-col gap-3 overflow-y-auto pr-1">
        {folders.map((f) => {
          const key = folderKey(f)
          return (
            <Folder
              key={key}
              folder={f}
              starts={f.account ? starts.get(f.account) : undefined}
              open={!closed.has(key)}
              onToggle={() => toggle(key)}
              onDrop={f.account ? (id) => moveTo(id, f.account!) : undefined}
              onRename={f.account ? (to) => rename.mutateAsync({ from: f.account!, to }) : undefined}
              onAskStarts={
                assistant
                  ? () => {
                      // The account's first statement read: its chat sees the whole chain.
                      const first = startsChatStatement(f.statements)
                      if (!first) return
                      setClosed((c) => {
                        const next = new Set(c)
                        next.delete(key)
                        return next
                      })
                      const note = startingNote(starts.get(f.account!) ?? [], f.from)
                      const dates = note?.text.replace(/^Starting dates: /, '')
                      const why = note?.reasons?.length ? ` ${note.reasons.join('. ')}.` : ''
                      ask(
                        first.id,
                        `${f.account} has more than one starting date (${dates}).${why} Why don't its balances carry over, and how do we fix it?`,
                      )
                    }
                  : undefined
              }
            >
              {f.statements.map((s) => {
                const failed = hasProblem(s)
                // Not draggable while its chat is open — the text box must take the mouse.
                const draggable = isFiled(s) && asking !== s.id
                return (
                <li
                  key={s.id}
                  {...(draggable ? statementDragProps(s.id) : {})}
                  className={cn(
                    'rounded-xl bg-white px-4 py-3 ring-1 ring-black/5',
                    isBusy(s) && 'ring-brand/20',
                    draggable && 'cursor-grab active:cursor-grabbing',
                    move.isPending && move.variables?.id === s.id && 'opacity-50',
                  )}
                >
                  <div className="flex items-center gap-3">
                  {s.source === 'PLAID' ? (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <Landmark className="size-5" />
                    </span>
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <FileText className="size-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {onOpenInLedger && s.status === 'DONE' ? (
                        <button
                          type="button"
                          onClick={() => onOpenInLedger(s.id)}
                          className="truncate text-left text-sm font-semibold text-[#0B1C2C] hover:text-brand hover:underline"
                          title={`See its ${s.transactionCount} transaction${s.transactionCount === 1 ? '' : 's'} in the ledger — ${s.filename}`}
                        >
                          {s.label}
                        </button>
                      ) : (
                        <p className="truncate text-sm font-semibold text-[#0B1C2C]" title={s.filename}>
                          {s.label}
                        </p>
                      )}
                      <StatusBadge s={s} />
                      {s.source === 'PLAID' && (
                        <Badge variant="outline" className="shrink-0 text-brand">
                          Bank feed
                        </Badge>
                      )}
                    </div>
                    <p
                      className={cn(
                        'text-xs',
                        // The reason is the customer's only explanation — never cut it off.
                        s.problem?.kind === 'NO_BALANCES'
                          ? 'mt-0.5 text-amber-800'
                          : failed
                            ? 'mt-0.5 text-red-700'
                            : 'truncate text-muted-foreground',
                      )}
                      title={subtitle(s, home)}
                    >
                      {subtitle(s, home)}
                      {s.movedByCustomer && ' · moved by you'}
                    </p>
                    {balanceLine(s) && (
                      <p className="truncate text-xs tabular-nums text-muted-foreground">{balanceLine(s)}</p>
                    )}
                    {(failed || (assistant && !isBusy(s) && s.status !== 'UPLOADED')) && (
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        {failed && (
                          <button
                            type="button"
                            className="font-medium text-brand hover:underline"
                            onClick={() => setDetails(details === s.id ? null : s.id)}
                          >
                            {details === s.id ? 'Hide details' : 'Details'}
                          </button>
                        )}
                        {assistant && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                            onClick={() => ask(s.id)}
                          >
                            <Sparkles className="size-3.5" />
                            {asking === s.id ? 'Close the chat' : failed ? 'Ask AI to fix it' : 'Ask AI about it'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {isFiled(s) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          title="Move to another account"
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-black/5 hover:text-foreground"
                        >
                          <FolderInput className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {/* base-ui throws when a GroupLabel is not inside a Group. */}
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Move to account</DropdownMenuLabel>
                            {accounts
                              .filter((a) => a !== folderOf(s))
                              .map((a) => (
                                <DropdownMenuItem key={a} onClick={() => moveTo(s.id, a)}>
                                  <Folder2 className="size-4" /> {a}
                                </DropdownMenuItem>
                              ))}
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setNewName('')
                              setNewFor(s)
                            }}
                          >
                            <FolderPlus className="size-4" /> New account…
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {failed && s.source !== 'PLAID' && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Try again"
                        disabled={retry.isPending}
                        onClick={() => retry.mutate(s.id)}
                      >
                        <RotateCcw />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={s.source === 'PLAID' ? 'View statement PDF' : 'View original PDF'}
                      onClick={() => {
                        setOpenError(null)
                        openOriginal(auth, s.id).catch((e: Error) => setOpenError(e.message))
                      }}
                    >
                      <ExternalLink />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Delete statement"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirm(s)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  </div>
                  {failed && details === s.id && <StatementDetails s={s} />}
                  {asking === s.id && (
                    <div className="mt-3 border-t pt-3">
                      <StatementChat key={askDraft ?? ''} statementId={s.id} initialDraft={askDraft} />
                    </div>
                  )}
                </li>
                )
              })}
            </Folder>
          )
        })}
      </div>
      {openError && <p className="mt-2 text-sm text-destructive">{openError}</p>}

      <Dialog open={confirmAll} onOpenChange={setConfirmAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Re-read {toReread} statement{toReread === 1 ? '' : 's'}?
            </DialogTitle>
            <DialogDescription>
              Every statement with a problem is read again from its PDF. While it is being read,
              its transactions leave your books; they come back as soon as it is done. A missing
              statement is not included — upload it to close the gap.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button
              disabled={retryAll.isPending}
              onClick={() =>
                retryAll.mutate(undefined, {
                  onSuccess: ({ queued }) => {
                    setConfirmAll(false)
                    setAllNote(
                      queued
                        ? `${queued} statement${queued === 1 ? ' is' : 's are'} being read again.`
                        : 'Nothing to read again right now.',
                    )
                  },
                })
              }
            >
              {retryAll.isPending ? 'Starting…' : 'Re-read all'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!newFor} onOpenChange={(open) => !open && setNewFor(null)}>
        <DialogContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              const name = newName.trim()
              if (!newFor || !name) return
              move.mutate({ id: newFor.id, accountName: name }, { onSuccess: () => setNewFor(null) })
            }}
          >
            <DialogHeader>
              <DialogTitle>Move to a new account</DialogTitle>
              <DialogDescription>
                {newFor?.label} gets its own folder. Name it the way you know the account, e.g. “TD
                Chequing 5234”.
              </DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              value={newName}
              maxLength={191}
              placeholder="Account name"
              onChange={(e) => setNewName(e.target.value)}
            />
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
              <Button type="submit" disabled={!newName.trim() || move.isPending}>
                {move.isPending ? 'Moving…' : 'Move'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this statement?</DialogTitle>
            <DialogDescription>
              {confirm?.filename} and its {confirm?.transactionCount ?? 0} transactions will be removed
              from your ledger and exports.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                confirm && remove.mutate(confirm.id, { onSuccess: () => setConfirm(null) })
              }
            >
              {remove.isPending ? 'Deleting…' : 'Delete statement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** One account's folder: a header that collapses it, and a drop target for statements. */
function Folder({
  folder,
  starts,
  open,
  onToggle,
  onDrop,
  onRename,
  onAskStarts,
  children,
}: {
  folder: StatementFolder
  /** Where the account's books start (its Starting balance rows); two or more = a break. */
  starts?: StartingDate[]
  open: boolean
  onToggle: () => void
  /** Undefined for the "Not sorted yet" folder — nothing can be dropped there. */
  onDrop?: (statementId: number) => void
  /** step2: rename the account (pencil beside the header); throws to keep the field open. */
  onRename?: (to: string) => Promise<unknown>
  /** step2: open the AI chat about the starting dates (undefined = the assistant is off). */
  onAskStarts?: () => void
  children: ReactNode
}) {
  const drop = useFolderDrop(onDrop)
  const range = folderRange(folder)
  // Always say where the account starts; red only when it starts more than once.
  const note = folder.account ? startingNote(starts ?? [], folder.from) : null
  // One currency for the account only when every read statement in it agrees.
  const currencies = new Set(folder.statements.filter((s) => s.status === 'DONE').map((s) => s.accountCurrency ?? null))
  const currency = currencies.size === 1 ? [...currencies][0] : undefined
  return (
    <section
      {...drop.props}
      className={cn(
        'rounded-2xl bg-muted/40 p-2 ring-1 ring-black/5 transition-colors',
        drop.over && 'bg-brand/5 ring-2 ring-brand/40',
      )}
    >
      <div className="flex items-center gap-1 rounded-lg pr-2 hover:bg-black/5">
        <FolderRename account={folder.account} onRename={onRename}>
          <button
            type="button"
            onClick={onToggle}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left"
          >
            <ChevronRight className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
            {folder.account ? (
              open ? (
                <FolderOpen className="size-4 shrink-0 text-brand" />
              ) : (
                <Folder2 className="size-4 shrink-0 text-brand" />
              )
            ) : (
              <FileClock className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="flex min-w-0 flex-col">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-[#0B1C2C]">{folder.account ?? 'Not sorted yet'}</span>
                {note?.warn && <span className="size-2 shrink-0 rounded-full bg-red-500" title={STARTS_WARNING} />}
              </span>
              {note && (
                <span className={cn('text-xs', note.warn ? 'font-medium text-red-600' : 'truncate text-muted-foreground')}>
                  {note.text}
                </span>
              )}
              {/* Why each later start is there: a missing statement, or balances that don't carry over. */}
              {note?.reasons?.map((r) => (
                <span key={r} className="text-xs text-red-600/80">
                  {r}
                </span>
              ))}
            </span>
            {folder.card && (
              <Badge className="gap-1 bg-slate-100 text-slate-600 ring-1 ring-slate-500/15">
                <CreditCard className="size-3" /> Card
              </Badge>
            )}
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {range && <span className="hidden sm:inline">{range} · </span>}
              {folder.statements.length} statement{folder.statements.length === 1 ? '' : 's'}
            </span>
          </button>
        </FolderRename>
        {folder.account && currencies.size > 0 && <AccountCurrency account={folder.account} currency={currency} />}
      </div>
      {note?.warn && (
        // step2: the whole warning, never cut off or hidden in a hover — and a way to fix it.
        <p className="px-8 pb-1 text-xs text-red-600/80">
          {STARTS_WARNING}
          {onAskStarts && (
            <button
              type="button"
              className="ml-2 inline-flex items-center gap-1 font-medium text-brand hover:underline"
              onClick={onAskStarts}
            >
              <Sparkles className="size-3.5" /> Ask AI to fix it
            </button>
          )}
        </p>
      )}
      {open && <ul className="mt-1 flex flex-col gap-2">{children}</ul>}
    </section>
  )
}

/**
 * step2 (2026-11-08): the folder header's name renamed in place — the account everywhere (rows,
 * rules, the connected bank), through `POST accounts/rename`. The pencil sits beside the
 * header's toggle button, never inside it.
 */
function FolderRename({
  account,
  onRename,
  children,
}: {
  account: string | null
  onRename?: (to: string) => Promise<unknown>
  children: ReactNode
}) {
  if (!account || !onRename) return <>{children}</>
  return (
    <InlineRename value={account} onSave={onRename} label={`Rename ${account}`} className="flex-1">
      {children}
    </InlineRename>
  )
}

/**
 * step2: the statement a folder's starting-dates chat opens on — the account's first one
 * that was read (its chat lists the account's other statements with their balances).
 */
function startsChatStatement(statements: Statement[]): Statement | undefined {
  return [...statements]
    .filter((s) => s.status === 'DONE')
    .sort((a, b) => (a.periodStart ?? '').localeCompare(b.periodStart ?? ''))[0]
}

/** step8: the full story of a statement we could not read — the checks, what it means, what to do. */
function StatementDetails({ s }: { s: Statement }) {
  const help = statementHelp(s, s.problem?.kind)
  return (
    <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-[#0B1C2C]/90">
      {s.errorDetail && (
        <>
          <p className="font-semibold">What went wrong, exactly</p>
          <p className="mt-0.5 mb-2 font-mono text-[11px] break-words whitespace-pre-wrap">{s.errorDetail}</p>
        </>
      )}
      {!!s.checks?.length && (
        <>
          <p className="font-semibold">What did not match the bank's totals</p>
          <ul className="mt-0.5 mb-2 list-disc pl-5">
            {s.checks.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </>
      )}
      {help && (
        <>
          <p className="font-semibold">What this means</p>
          <p className="mt-0.5">{help.what}</p>
          <p className="mt-2 font-semibold">What you can do</p>
          <ul className="mt-0.5 list-disc pl-5">
            {help.todo.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </>
      )}
      {s.customerNote && (
        <p className="mt-2">
          <span className="font-semibold">What you told us: </span>
          {s.customerNote}
        </p>
      )}
    </div>
  )
}
