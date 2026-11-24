import { useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import i18n, { currentLocale } from '@/i18n'
import { useSearchState } from '@/hooks/useBookView'
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
import { AccountErrors, type AccountErrorLine } from './AccountErrors'
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
import { startingDatesList, startingNote, startsWarning, type StartingDate } from '@/lib/starting-dates'

// The check against the bank's own totals happens on the server and is kept there; the
// customer only sees the outcome — Done, or Needs review with the reason.
function StatusBadge({ s }: { s: Statement }) {
  const { t } = useTranslation(['books', 'common'])
  // step2: a problem is named instead of "Done" / "Needs review".
  if (s.problem) {
    const soft = s.problem.kind === 'NO_BALANCES' || s.problem.kind === 'OTHER'
    return (
      <Badge
        className={cn(
          'gap-1 ring-1',
          soft ? 'bg-amber-50 text-amber-800 ring-amber-600/25' : 'bg-red-50 text-red-700 ring-red-600/20',
        )}
      >
        {soft ? <AlertTriangle className="size-3" /> : <AlertCircle className="size-3" />} {s.problem.title}
        {(s.errors?.length ?? 0) > 1 && <span className="opacity-75">+{s.errors!.length - 1}</span>}
      </Badge>
    )
  }
  if (s.status === 'DONE') {
    return (
      <Badge className="gap-1 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
        <CheckCircle2 className="size-3" /> {t('statements.status.done')}
      </Badge>
    )
  }
  if (s.status === 'NEEDS_REVIEW') {
    return (
      <Badge className="gap-1 bg-amber-50 text-amber-800 ring-1 ring-amber-600/25">
        <AlertTriangle className="size-3" /> {t('statements.status.needsReview')}
      </Badge>
    )
  }
  if (s.status === 'FAILED') {
    return (
      <Badge className="gap-1 bg-red-50 text-red-700 ring-1 ring-red-600/20">
        <AlertCircle className="size-3" /> {t('statements.status.failed')}
      </Badge>
    )
  }
  if (s.status === 'UPLOADED') {
    return (
      <Badge className="gap-1 bg-slate-100 text-slate-600 ring-1 ring-slate-500/15">
        <FileClock className="size-3" /> {t('statements.status.notRead')}
      </Badge>
    )
  }
  if (s.status === 'PROCESSING') {
    return (
      <Badge className="gap-1 bg-brand/10 text-brand ring-1 ring-brand/25">
        <Loader2 className="size-3 animate-spin" /> {t('statements.status.reading')}
      </Badge>
    )
  }
  return (
    <Badge className="gap-1 bg-slate-100 text-slate-600 ring-1 ring-slate-500/15">
      <Clock className="size-3" /> {t('statements.status.queued')}
    </Badge>
  )
}

/** The second line under a statement: what it is, or what is happening to it. */
function subtitle(s: Statement, home?: string): string {
  if (s.problem) return s.problem.text
  switch (s.status) {
    case 'FAILED':
      return s.error ?? i18n.t('books:statements.couldNotRead')
    case 'NEEDS_REVIEW':
      return s.error ?? i18n.t('books:statements.noMatch')
    case 'DONE':
      return [
        i18n.t('books:statements.txCount', { count: s.transactionCount }),
        // A foreign statement says which currency its amounts are in.
        home && s.accountCurrency && s.accountCurrency !== home
          ? i18n.t('books:statements.inCurrency', { currency: s.accountCurrency })
          : null,
        s.filename,
      ]
        .filter(Boolean)
        .join(' · ')
    case 'PROCESSING':
      return i18n.t('books:statements.readingAll')
    case 'UPLOADED':
      return [s.filename, i18n.t('books:statements.clickGenerate')].join(' · ')
    default:
      return i18n.t('books:statements.waiting')
  }
}


type Filter = 'all' | 'done' | 'unread' | 'waiting'
const isFilter = (v: string): v is Filter => ['all', 'done', 'unread', 'waiting'].includes(v)
const FILTERS: Array<{ id: Filter; test: (s: Statement) => boolean }> = [
  { id: 'all', test: () => true },
  { id: 'done', test: (s) => s.status === 'DONE' },
  { id: 'unread', test: hasProblem },
  { id: 'waiting', test: (s) => s.status === 'UPLOADED' || isBusy(s) },
]

const day = (iso: string) =>
  new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString(currentLocale(), { month: 'short', year: 'numeric' })

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
  const { t } = useTranslation(['books', 'common'])
  const { auth } = useBook()
  // step11 (2026-11-23): in the URL (`?filter=`), so a refresh keeps it.
  const [filter, setFilter] = useSearchState<Filter>('filter', 'all', isFilter)
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
        <p className="text-sm font-medium text-[#0B1C2C]">{t('statements.empty')}</p>
        <p className="text-sm text-muted-foreground">{t('statements.emptyHint')}</p>
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
              {t(`statements.filter.${f.id}`)} · {n}
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
            {t('statements.rereadAllCount', { count: toReread })}
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
            {anyOpen ? t('statements.collapseAll') : t('statements.expandAll')}
          </Button>
        )}
      </div>
      {accounts.length > 1 && (
        <p className="mb-2 text-xs text-muted-foreground">
          <Trans t={t} i18nKey="statements.dragHint" components={{ icon: <FolderInput className="inline size-3.5" /> }} />
        </p>
      )}
      {move.error && <p className="mb-2 text-sm text-destructive">{move.error.message}</p>}
      {retryAll.error && <p className="mb-2 text-sm text-destructive">{retryAll.error.message}</p>}
      {allNote && <p className="mb-2 text-sm text-muted-foreground">{allNote}</p>}
      {!folders.length && (
        <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-black/5">
          {t('statements.nothing')}
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
                      const list = starts.get(f.account!) ?? []
                      const note = startingNote(list, f.from)
                      const dates = startingDatesList(list)
                      const why = note?.reasons?.length ? ` ${note.reasons.join('. ')}.` : ''
                      ask(first.id, t('statements.askStarts', { account: f.account, dates, why }))
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
                          title={t('statements.seeInLedger', { count: s.transactionCount, file: s.filename })}
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
                          {t('statements.bankFeed')}
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
                      {s.movedByCustomer && ` · ${t('statements.movedByYou')}`}
                    </p>
                    {/* step9: the other errors too — every one, always shown. */}
                    <AccountErrors
                      errors={(s.errors ?? []).slice(1).map((e) => ({ ...e, statementId: s.id }))}
                      className="mt-0.5"
                    />
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
                            {details === s.id ? t('statements.hideDetails') : t('statements.details')}
                          </button>
                        )}
                        {assistant && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                            onClick={() => ask(s.id)}
                          >
                            <Sparkles className="size-3.5" />
                            {asking === s.id ? t('statements.closeChat') : failed ? t('statements.askFix') : t('statements.askAbout')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {isFiled(s) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          title={t('statements.moveTitle')}
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-black/5 hover:text-foreground"
                        >
                          <FolderInput className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {/* base-ui throws when a GroupLabel is not inside a Group. */}
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>{t('statements.moveTo')}</DropdownMenuLabel>
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
                            <FolderPlus className="size-4" /> {t('statements.newAccount')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {failed && s.source !== 'PLAID' && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title={t('common:actions.retry')}
                        disabled={retry.isPending}
                        onClick={() => retry.mutate(s.id)}
                      >
                        <RotateCcw />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={s.source === 'PLAID' ? t('statements.viewPdf') : t('statements.viewOriginal')}
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
                      title={t('statements.delete')}
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
            <DialogTitle>{t('statements.rereadTitle', { count: toReread })}</DialogTitle>
            <DialogDescription>{t('statements.rereadText')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>{t('common:actions.cancel')}</DialogClose>
            <Button
              disabled={retryAll.isPending}
              onClick={() =>
                retryAll.mutate(undefined, {
                  onSuccess: ({ queued }) => {
                    setConfirmAll(false)
                    setAllNote(
                      queued
                        ? t('statements.rereadQueued', { count: queued })
                        : t('statements.rereadNone'),
                    )
                  },
                })
              }
            >
              {retryAll.isPending ? t('statements.starting') : t('statements.rereadAll')}
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
              <DialogTitle>{t('statements.newAccountTitle')}</DialogTitle>
              <DialogDescription>{t('statements.newAccountText', { label: newFor?.label })}</DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              value={newName}
              maxLength={191}
              placeholder={t('statements.accountName')}
              onChange={(e) => setNewName(e.target.value)}
            />
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>{t('common:actions.cancel')}</DialogClose>
              <Button type="submit" disabled={!newName.trim() || move.isPending}>
                {move.isPending ? t('statements.moving') : t('statements.move')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('statements.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('statements.deleteText', { file: confirm?.filename, count: confirm?.transactionCount ?? 0 })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t('common:actions.cancel')}</DialogClose>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                confirm && remove.mutate(confirm.id, { onSuccess: () => setConfirm(null) })
              }
            >
              {remove.isPending ? t('statements.deleting') : t('statements.delete')}
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
  const { t } = useTranslation(['books', 'common'])
  const drop = useFolderDrop(onDrop)
  const range = folderRange(folder)
  // Always say where the account starts; red only when it starts more than once.
  const note = folder.account ? startingNote(starts ?? [], folder.from) : null
  // One currency for the account only when every read statement in it agrees.
  const currencies = new Set(folder.statements.filter((s) => s.status === 'DONE').map((s) => s.accountCurrency ?? null))
  const currency = currencies.size === 1 ? [...currencies][0] : undefined
  // step9 (2026-11-15): every open error of the folder's statements, shown on the folder
  // itself — folded or not.
  const errors: AccountErrorLine[] = folder.account
    ? folder.statements.flatMap((s) =>
        (s.errors?.length ? s.errors : s.problem ? [{ ...s.problem, source: 'SYSTEM' as const }] : []).map((e) => ({
          statementId: s.id,
          statement: s.label,
          kind: e.kind,
          title: e.title,
          text: e.text,
          source: e.source,
        })),
      )
    : []
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
                <span className="truncate text-sm font-semibold text-[#0B1C2C]">{folder.account ?? t('statements.notSorted')}</span>
                {note?.warn && <span className="size-2 shrink-0 rounded-full bg-red-500" title={startsWarning()} />}
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
                <CreditCard className="size-3" /> {t('statements.card')}
              </Badge>
            )}
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {range && <span className="hidden sm:inline">{range} · </span>}
              {t('statements.count', { count: folder.statements.length })}
            </span>
          </button>
        </FolderRename>
        {folder.account && currencies.size > 0 && <AccountCurrency account={folder.account} currency={currency} />}
      </div>
      {note?.warn && (
        // step2: the whole warning, never cut off or hidden in a hover — and a way to fix it.
        <p className="px-8 pb-1 text-xs text-red-600/80">
          {startsWarning()}
          {onAskStarts && (
            <button
              type="button"
              className="ml-2 inline-flex items-center gap-1 font-medium text-brand hover:underline"
              onClick={onAskStarts}
            >
              <Sparkles className="size-3.5" /> {t('statements.askFix')}
            </button>
          )}
        </p>
      )}
      <AccountErrors errors={errors} className="px-8 pb-1" />
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
  const { t } = useTranslation(['books', 'common'])
  if (!account || !onRename) return <>{children}</>
  return (
    <InlineRename value={account} onSave={onRename} label={t('statements.renameAccount', { name: account })} className="flex-1">
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
  const { t } = useTranslation(['books', 'common'])
  const help = statementHelp(s, s.problem?.kind)
  return (
    <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-[#0B1C2C]/90">
      {/* step9: every saved error. */}
      {(s.errors?.length ?? 0) > 0 && (
        <>
          <p className="font-semibold">{t('statements.everyProblem')}</p>
          <ul className="mt-0.5 mb-2 list-disc space-y-1 pl-5">
            {s.errors!.map((e) => (
              <li key={e.id}>
                <span className="font-medium">{e.title}</span>
                {e.source === 'AI' && <span className="text-muted-foreground"> · {t('statements.notedByAi')}</span>}
                <span className="block text-[#0B1C2C]/75">{e.text}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {s.errorDetail && (
        <>
          <p className="font-semibold">{t('statements.whatWentWrong')}</p>
          <p className="mt-0.5 mb-2 font-mono text-[11px] break-words whitespace-pre-wrap">{s.errorDetail}</p>
        </>
      )}
      {!!s.checks?.length && (
        <>
          <p className="font-semibold">{t('statements.whatDidNotMatch')}</p>
          <ul className="mt-0.5 mb-2 list-disc pl-5">
            {s.checks.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </>
      )}
      {help && (
        <>
          <p className="font-semibold">{t('statements.whatMeans')}</p>
          <p className="mt-0.5">{help.what}</p>
          <p className="mt-2 font-semibold">{t('statements.whatToDo')}</p>
          <ul className="mt-0.5 list-disc pl-5">
            {help.todo.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}
      {s.customerNote && (
        <p className="mt-2">
          <span className="font-semibold">{t('statements.youTold')} </span>
          {s.customerNote}
        </p>
      )}
    </div>
  )
}
