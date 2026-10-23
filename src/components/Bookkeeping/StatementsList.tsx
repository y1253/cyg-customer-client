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
  Trash2,
} from 'lucide-react'
import { isBusy, openOriginal, unreadable, type Statement } from '@/api/bookkeeping'
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
import { useMoveStatement } from '@/hooks/useMoveStatement'
import { useRetryStatement } from '@/hooks/useRetryStatement'
import { cn } from '@/lib/utils'
import { statementDragProps, useFolderDrop } from './statement-drag'
import { folderKey, folderOf, groupByAccount, isFiled, startsByFolder, type StatementFolder } from './statement-folders'
import { STARTS_WARNING, startingNote } from '@/lib/starting-dates'

// The check against the bank's own totals happens on the server and is kept there; the
// customer only sees the outcome — Done, or Needs review with the reason.
function StatusBadge({ s }: { s: Statement }) {
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
  { id: 'unread', label: "Couldn't read", test: unreadable },
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
export function StatementsList({ statements, loading }: { statements: Statement[]; loading: boolean }) {
  const { auth } = useBook()
  const [filter, setFilter] = useState<Filter>('all')
  const remove = useDeleteStatement()
  const retry = useRetryStatement()
  const move = useMoveStatement()
  const [confirm, setConfirm] = useState<Statement | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const [newFor, setNewFor] = useState<Statement | null>(null)
  const [newName, setNewName] = useState('')
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
            >
              {f.statements.map((s) => (
                <li
                  key={s.id}
                  {...(isFiled(s) ? statementDragProps(s.id) : {})}
                  className={cn(
                    'flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-black/5',
                    isBusy(s) && 'ring-brand/20',
                    isFiled(s) && 'cursor-grab active:cursor-grabbing',
                    move.isPending && move.variables?.id === s.id && 'opacity-50',
                  )}
                >
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
                      <p className="truncate text-sm font-semibold text-[#0B1C2C]" title={s.filename}>
                        {s.label}
                      </p>
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
                        s.status === 'NEEDS_REVIEW'
                          ? 'mt-0.5 text-amber-800'
                          : s.status === 'FAILED'
                            ? 'mt-0.5 text-red-700'
                            : 'truncate text-muted-foreground',
                      )}
                      title={subtitle(s, home)}
                    >
                      {subtitle(s, home)}
                      {s.movedByCustomer && ' · moved by you'}
                    </p>
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
                    {(s.status === 'FAILED' || s.status === 'NEEDS_REVIEW') && (
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
                </li>
              ))}
            </Folder>
          )
        })}
      </div>
      {openError && <p className="mt-2 text-sm text-destructive">{openError}</p>}

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
  children,
}: {
  folder: StatementFolder
  /** Where the account's books start (its Starting balance rows); two or more = a break. */
  starts?: Array<{ date: string | null }>
  open: boolean
  onToggle: () => void
  /** Undefined for the "Not sorted yet" folder — nothing can be dropped there. */
  onDrop?: (statementId: number) => void
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
              <span
                className={cn('truncate text-xs', note.warn ? 'font-medium text-red-600' : 'text-muted-foreground')}
                title={note.warn ? STARTS_WARNING : undefined}
              >
                {note.text}
              </span>
            )}
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
        {folder.account && currencies.size > 0 && <AccountCurrency account={folder.account} currency={currency} />}
      </div>
      {open && <ul className="mt-1 flex flex-col gap-2">{children}</ul>}
    </section>
  )
}
