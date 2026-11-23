import { useEffect, useMemo, useState, type CSSProperties, type DragEvent, type PointerEvent, type ReactNode } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Columns3,
  CornerDownRight,
  Folder,
  RotateCcw,
  Paperclip,
  Plus,
  Search,
  Split,
} from 'lucide-react'
import {
  openOriginal,
  UNCLARIFIED_NAME,
  type LedgerPageRow,
  type LedgerQuery,
  type LedgerTransaction,
  type Statement,
} from '@/api/bookkeeping'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { CustomColumn, CustomColumnsData } from '@/api/customColumns'
import { useBook } from '@/hooks/useBook'
import { useCustomColumns } from '@/hooks/useCustomColumns'
import { useLedgerColumns, type LedgerColumns } from '@/hooks/useLedgerColumns'
import { useDebounced } from '@/hooks/useDebounced'
import { useLedgerPages, useLedgerSummary } from '@/hooks/useLedgerPages'
import { useDuplicateSplit } from '@/hooks/useSplits'
import { money } from '@/lib/money'
import { useTableControls, type SortState } from '@/lib/table-sort'
import { rulesText } from '@/lib/custom-columns'
import { cn } from '@/lib/utils'
import { ColumnHeader } from './ColumnHeader'
import { CustomCell } from './CustomCell'
import { CustomColumnsDialog, type ColumnsDialogStart } from './CustomColumnsDialog'
import { NameRuleDialog } from './NameRuleDialog'
import { DeleteSplitButton, ProductCell, SplitAmountCell, SplitCategoryCell, TransactionCategoryCell } from './SplitCells'
import { SplitRuleButton } from './SplitRuleButton'
import { StickyScrollbar } from './StickyScrollbar'
import { TransactionAttachmentsDialog } from './TransactionAttachmentsDialog'
import { folderOf, groupByAccount } from './statement-folders'

/** Date-only ISO → "Sep 2, 2026", parsed as LOCAL midnight so it never slips a day. */
const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

/**
 * step8 (2026-11-11): from md up every column is shown in the customer's own order and
 * widths (`useLedgerColumns`: drag a header to move it, its right edge to resize — kept in
 * this browser) and the table scrolls sideways INSIDE its card when they add up to more than
 * the screen (user's decision; it used to never scroll). A phone keeps Date · Name · Amount,
 * with the description, accounts and statement folded under the name.
 */
const MD = 'hidden md:table-cell'
/** The columns a phone shows, and their widths there. */
const PHONE: Record<string, string> = { date: 'w-[5.5rem]', name: '', amount: 'w-[7.5rem]' }
/** A custom column's id is `c<number>` — never a fixed one ("credit" starts with c too). */
const isCustom = (id: string) => /^c\d+$/.test(id)
const customIdOf = (id: string) => Number(id.slice(1))

/** step8 (user's rule): the POSTING date is the date; the pending one, when different, under it. */
function DateStack({ t }: { t: LedgerTransaction }) {
  const pending = fmtDate(t.pendingDate)
  const posting = fmtDate(t.postingDate)
  return (
    <span className="flex flex-col whitespace-normal text-muted-foreground">
      <span>{posting || pending}</span>
      {pending && posting && posting !== pending && (
        <span className="text-[11px] leading-tight text-muted-foreground/70" title="Pending (authorized) date">
          pending {pending}
        </span>
      )}
    </span>
  )
}

/**
 * The ledger in the firm's own columns: date (posting, with the pending date under it), name,
 * description, amount, debit, credit, statement — plus the customer's own columns (step8) —
 * in the customer's order and widths (see `MD`). The bank account sits on one side of every row and the AI-chosen
 * account on the other (the offset), shown as a chip.
 * A transaction's NAME and its CATEGORY (the offset chip) can be clicked to change them —
 * for that row only, or always for that payee (`NameRuleDialog`).
 * `account` limits it to the rows posted to one account (from the chart of accounts).
 * A statement's printed starting balance comes as its own shaded row (`kind: 'opening'`).
 * A transaction can be SPLIT by hand (hover → Split) or by a split rule (step9 part 4, "from <rule>"): each split
 * (`kind: 'split'`) sits under it with its own name and category, and the transaction shows what is left.
 * Each transaction's splits fold away on their own (the chip with their count) or all at once; folded, it shows
 * its full bank amount again (view only — downloads always include them). The net change is the same either way.
 * A split's name can be clicked to change it.
 * The paperclip on a transaction opens its receipts, cheques and voice notes; `focusId`
 * shows one transaction only (from "View transaction" on an attachment); `name` the rows of
 * one payee (from the Names tab or the income statement).
 * step11 (2026-11-23): fetched page by page from the server (`useLedgerPages`), which also
 * searches, filters, sorts and totals it — the next 100 transactions load as the end comes
 * into view, and the footer totals cover every row. Each column header sorts and filters its own column
 * (`ColumnHeader`); a transaction moves together with its tax lines and splits, judged by
 * the transaction itself.
 */
export function LedgerTable({
  statements,
  enabled = true,
  account,
  onClearAccount,
  focusId,
  onClearFocus,
  name,
  onClearName,
  defaultSort = null,
  from = null,
  to = null,
  onClearRange,
  statementId: initialStatementId = null,
  description = null,
  onClearDescription,
  subName = null,
  onClearSubName,
}: {
  statements: Statement[]
  /** step11 (2026-11-23): fetch only while shown (the Ledger tab, the open popup). */
  enabled?: boolean
  account?: string | null
  onClearAccount?: () => void
  focusId?: number | null
  onClearFocus?: () => void
  /** Only this payee's transactions ("Unclarified name" = the rows with none). */
  name?: string | null
  onClearName?: () => void
  /** The order it opens in (e.g. by name, from the income statement); null = newest first. */
  defaultSort?: SortState | null
  /** Only rows dated in this period (date-only ISO, either end open) — a report drill-down. */
  from?: string | null
  to?: string | null
  onClearRange?: () => void
  /** step2 (2026-11-11): open on one statement's rows (a statement clicked on the Names tab). */
  statementId?: number | null
  /** step2 (2026-11-15): only the transactions with this description (clicked on the Names tab). */
  description?: string | null
  onClearDescription?: () => void
  /** step9: only the rows of this sub-name (and their tax lines), from the Names tab popup. */
  subName?: { id: number; name: string } | null
  onClearSubName?: () => void
}) {
  const [query, setQuery] = useState('')
  // step11 (2026-11-23): the search runs on the server — sent once typing pauses.
  const searched = useDebounced(query.trim(), 300)
  const [statementId, setStatementId] = useState<number | 'all'>(initialStatementId ?? 'all')
  // The account folder picked above the ledger; its statements' chips show under it.
  const [folderName, setFolderName] = useState<string | 'all'>(() => {
    const s = initialStatementId == null ? null : statements.find((x) => x.id === initialStatementId)
    return (s && folderOf(s)) ?? 'all'
  })
  const controls = useTableControls(defaultSort)
  // The transactions whose split rows are folded away.
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(new Set())
  const [editing, setEditing] = useState<LedgerTransaction | null>(null)
  // step2 (2026-11-15): Split adds a $0.00 split in place; its amount field takes the focus.
  const duplicate = useDuplicateSplit()
  const [newSplitId, setNewSplitId] = useState<number | null>(null)
  const [splitError, setSplitError] = useState<string | null>(null)
  const addSplit = (id: number, parentId: number) => {
    setSplitError(null)
    setCollapsed((s) => {
      if (!s.has(parentId)) return s
      const next = new Set(s)
      next.delete(parentId)
      return next
    })
    duplicate.mutate(id, {
      onSuccess: (made) => setNewSplitId(made.id),
      onError: (e) => setSplitError(e.message),
    })
  }
  const [attaching, setAttaching] = useState<LedgerTransaction | null>(null)
  const { auth } = useBook()
  const [openError, setOpenError] = useState<string | null>(null)

  const done = statements.filter((s) => s.status === 'DONE')
  const folders = useMemo(() => groupByAccount(statements.filter((s) => s.status === 'DONE')), [statements])
  const folder = folderName === 'all' ? null : (folders.find((f) => f.account === folderName) ?? null)
  // One account: its statements are the chips, as before. Several: pick an account first.
  const statementChips = folders.length > 1 ? (folder?.statements ?? []) : done

  // step11 (2026-11-23, user's request): filtered, searched, sorted, totalled and paged on
  // the server (`GET transactions/page` + `/summary`) — the browser holds only the pages
  // scrolled through. Folding every family sorts / filters Amount on the full bank amount.
  // A fresh object each render is fine: React Query compares query keys by value.
  const allFolded = collapsed.size > 0 && !subName
  const ledgerQuery: LedgerQuery = {
    q: searched || undefined,
    statementIds: statementId !== 'all' ? [statementId] : folder ? folder.statements.map((s) => s.id) : null,
    account,
    focusId,
    name,
    description,
    subNameId: subName?.id ?? null,
    from,
    to,
    filters: controls.filters,
    sort: controls.sort,
    folded: allFolded,
  }
  const pages = useLedgerPages(ledgerQuery, { enabled })
  const summary = useLedgerSummary(ledgerQuery, { enabled })
  const loading = pages.isPending || summary.isPending
  const transactions = useMemo(() => pages.data?.pages.flatMap((p) => p.rows) ?? [], [pages.data])
  // A split rule's own ledger is nothing but its splits: never fold them there.
  const isAgency = summary.data?.isAgency ?? false
  // Per transaction: its split rows on the pages loaded (a page never cuts a family).
  const family = useMemo(() => {
    const m = new Map<number, { rows: LedgerTransaction[] }>()
    for (const t of transactions) {
      if (t.kind !== 'split') continue
      const top = t.splitOfId ?? t.id
      const f = m.get(top) ?? { rows: [] }
      f.rows.push(t)
      m.set(top, f)
    }
    return m
  }, [transactions])
  const isOpen = (id: number) => isAgency || !collapsed.has(id)
  // Folded, a transaction shows its full bank amount again (`fullAmount`, from the server).
  const shownAmount = (t: LedgerPageRow) => (!t.kind && !isOpen(t.id) ? (t.fullAmount ?? t.amount) : t.amount)
  const toggle = (id: number) =>
    setCollapsed((s) => {
      const next = new Set(s)
      if (!next.delete(id)) next.add(id)
      return next
    })
  const anyOpen = [...family.keys()].some((id) => !collapsed.has(id))

  const custom = useCustomColumns()
  const customColumns = useMemo(() => custom.data?.columns ?? [], [custom.data])
  const customById = useMemo(() => new Map(customColumns.map((c) => [c.id, c])), [customColumns])
  const customIds = useMemo(() => customColumns.map((c) => c.id), [customColumns])
  const layout = useLedgerColumns(customIds)
  const [columnsOpen, setColumnsOpen] = useState(false)
  // step9 part 3: the "+" header opens the add form, a column's header its own form.
  const [columnsStart, setColumnsStart] = useState<ColumnsDialogStart>(null)
  // A new key per opening: the dialog starts on `columnsStart` afresh.
  const [columnsKey, setColumnsKey] = useState(0)
  const openColumns = (start: ColumnsDialogStart) => {
    setColumnsStart(start)
    setColumnsKey((k) => k + 1)
    setColumnsOpen(true)
  }
  /** A row as the column editor lists an answer to fix: "2026-03-04 · Walmart" (rows loaded so far). */
  const rowLabel = (id: number) => {
    const t = transactions.find((x) => x.id === id && !x.kind)
    return t ? [t.postingDate ?? t.pendingDate, t.name ?? t.description].filter(Boolean).join(' · ') : undefined
  }

  // Folded split rows are hidden here (view only); a sub-name's or a split rule's ledger never folds.
  const shown = transactions.filter(
    (t) => subName !== null || isAgency || t.kind !== 'split' || !collapsed.has(t.splitOfId ?? t.id),
  )
  // The footer covers every row the query keeps, loaded or not (the net change is the same
  // folded or not). With foreign statements, the home-currency net too.
  const net = summary.data?.net ?? 0
  const homeNet = summary.data?.homeNet ?? null
  const splitCount = summary.data?.splitCount ?? 0
  const txCount = summary.data?.txCount ?? 0
  const allTx = summary.data?.allTx ?? 0
  const hasMore = !!pages.hasNextPage
  // The next page loads as the last row nears the screen.
  const [sentinel, setSentinel] = useState<HTMLTableRowElement | null>(null)
  const { fetchNextPage, isFetchingNextPage } = pages
  useEffect(() => {
    if (!sentinel || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage()
      },
      { rootMargin: '600px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel, hasMore, isFetchingNextPage, fetchNextPage])

  // The table's own sideways scroller (shadcn's `table-container`), mirrored at the top of
  // the screen by `StickyScrollbar`. Looked up after each render: the table comes and goes
  // with loading / an empty ledger.
  const [card, setCard] = useState<HTMLDivElement | null>(null)
  const [scroller, setScroller] = useState<HTMLElement | null>(null)
  const hasTable = !loading && transactions.length > 0
  useEffect(() => {
    // It reads the DOM React has just committed — what an effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScroller(hasTable ? (card?.querySelector<HTMLElement>('[data-slot="table-container"]') ?? null) : null)
  }, [card, hasTable])

  return (
    // overflow-CLIP, not hidden: a hidden box is a scroll container, and the sticky top
    // scrollbar inside it would stick to it instead of the screen.
    <div ref={setCard} className="overflow-clip rounded-2xl bg-white ring-1 ring-black/5">
      <div className="flex flex-col gap-3 border-b px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-5 sm:py-4">
        <div className="relative w-full shrink-0 sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, description or account"
            className="h-10 pl-9"
          />
        </div>
        {account && (
          <button
            type="button"
            onClick={onClearAccount}
            className="shrink-0 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-brand hover:bg-brand/15"
            title="Show every account"
          >
            {account} ✕
          </button>
        )}
        {name && (
          <button
            type="button"
            onClick={onClearName}
            className="shrink-0 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-brand hover:bg-brand/15"
            title="Show every name"
          >
            {name} ✕
          </button>
        )}
        {subName && (
          <button
            type="button"
            onClick={onClearSubName}
            className="max-w-full shrink-0 truncate rounded-full bg-brand/10 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-brand hover:bg-brand/15"
            title="Show every row of the name"
          >
            {subName.name} ✕
          </button>
        )}
        {description && (
          <button
            type="button"
            onClick={onClearDescription}
            className="max-w-full shrink-0 truncate rounded-full bg-brand/10 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-brand hover:bg-brand/15"
            title="Show every description"
          >
            “{description}” ✕
          </button>
        )}
        {(from || to) && (
          <button
            type="button"
            onClick={onClearRange}
            className="shrink-0 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-brand hover:bg-brand/15"
            title="Show every date"
          >
            {from && to ? `${fmtDate(from)} – ${fmtDate(to)}` : from ? `From ${fmtDate(from)}` : `Up to ${fmtDate(to)}`} ✕
          </button>
        )}
        {(controls.activeCount > 0 || controls.sort?.key !== defaultSort?.key || controls.sort?.dir !== defaultSort?.dir) && (
          <button
            type="button"
            onClick={() => {
              controls.clearFilters()
              controls.setSort(defaultSort)
            }}
            className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            title="Back to every row, in the usual order"
          >
            {controls.activeCount > 0
              ? `Clear ${controls.activeCount} column filter${controls.activeCount === 1 ? '' : 's'} ✕`
              : 'Reset order ✕'}
          </button>
        )}
        {focusId != null && (
          <button
            type="button"
            onClick={onClearFocus}
            className="shrink-0 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-brand hover:bg-brand/15"
            title="Show every transaction"
          >
            One transaction ✕
          </button>
        )}
        {(folders.length > 1 || statementChips.length > 1) && (
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {folders.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {[{ id: 'all', label: 'All accounts' }, ...folders.map((f) => ({ id: f.account!, label: f.account! }))].map(
                  (opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setFolderName(opt.id)
                        setStatementId('all')
                      }}
                      className={cn(
                        'inline-flex max-w-full items-center gap-1 truncate rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                        // A folder emptied by a move falls back to All accounts.
                        (folder?.account ?? 'all') === opt.id
                          ? 'bg-[#0B1C2C] text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                      )}
                    >
                      {opt.id !== 'all' && <Folder className="size-3.5 shrink-0" />}
                      {opt.label}
                    </button>
                  ),
                )}
              </div>
            )}
            {statementChips.length > 1 && (
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {[{ id: 'all' as const, label: 'All statements' }, ...statementLabels(statementChips)].map(
              (opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatementId(opt.id)}
                  className={cn(
                    'max-w-full truncate rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                    statementId === opt.id
                      ? 'bg-[#0B1C2C] text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ),
            )}
          </div>
            )}
          </div>
        )}
        <div className="flex shrink-0 flex-wrap gap-2 sm:ml-auto">
          {layout.customized && (
            <Button
              variant="ghost"
              size="sm"
              onClick={layout.reset}
              className="hidden h-9 gap-1.5 text-muted-foreground md:inline-flex"
              title="Put the columns back in their usual order and widths"
            >
              <RotateCcw className="size-4" /> Reset columns
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => openColumns(null)}
            className="h-9 gap-1.5"
            title="Add your own columns (e.g. Business 1 / 2 / 3)"
          >
            <Columns3 className="size-4" /> Your columns
          </Button>
        {family.size > 0 && !isAgency && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCollapsed(anyOpen ? new Set(family.keys()) : new Set())}
            className="h-9 shrink-0 gap-1.5"
            title={
              anyOpen
                ? 'Fold every split away — each transaction at its full bank amount'
                : 'Show every split — the tax lines and splits taken out of each transaction'
            }
          >
            {anyOpen ? <ChevronsDownUp className="size-4" /> : <ChevronsUpDown className="size-4" />}
            {anyOpen ? 'Collapse all splits' : 'Expand all splits'}
          </Button>
        )}
        </div>
      </div>
      {openError && <p className="border-b px-3 py-2 text-sm text-destructive sm:px-5">{openError}</p>}
      {splitError && <p className="border-b px-3 py-2 text-sm text-destructive sm:px-5">{splitError}</p>}
      {(pages.error ?? summary.error) && (
        <p className="border-b px-3 py-2 text-sm text-destructive sm:px-5">{(pages.error ?? summary.error)!.message}</p>
      )}

      {loading ? (
        <div className="flex flex-col gap-2 p-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : !allTx ? (
        <div className="px-6 py-16 text-center">
          <p className="font-medium text-[#0B1C2C]">Your ledger is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a bank statement and every transaction will appear here, posted as a debit and a credit.
          </p>
        </div>
      ) : (
        <>
        <StickyScrollbar target={scroller} />
        {/* step9: fits the card until the customer resizes a column; only then may it scroll. */}
        <Table
          className={cn('table-fixed', layout.fit ? 'w-full' : 'md:w-(--tw) md:min-w-full')}
          style={layout.fit ? undefined : ({ '--tw': `calc(${layout.total}px + 2.5rem)` } as CSSProperties)}
        >
          <colgroup>
            {layout.order.map((id) => (
              <col
                key={id}
                className={cn(id in PHONE ? PHONE[id] : 'hidden md:table-column', 'md:w-(--w)')}
                style={{ '--w': layout.colWidth(id) } as CSSProperties}
              />
            ))}
            {/* step9 part 3: the "+" (add a column) — a narrow last column. */}
            <col className="hidden md:table-column md:w-10" />
          </colgroup>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <LedgerHeaders
                layout={layout}
                controls={controls}
                customById={customById}
                onEditColumn={(id) => openColumns({ editId: id })}
              />
              <TableHead className="hidden px-1 text-center md:table-cell">
                <button
                  type="button"
                  onClick={() => openColumns({ add: true })}
                  title="Add a new column of your own"
                  aria-label="Add a new column"
                  className="inline-flex size-7 items-center justify-center rounded-full border border-dashed border-brand/60 text-brand transition-colors hover:border-solid hover:bg-brand hover:text-white focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none"
                >
                  <Plus className="size-4" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((t, i, page) => {
              // Joined to its split rows: no divider between them.
              const joined = page[i + 1]?.kind === 'split'
              if (t.kind === 'split') {
                return (
                  <SplitRow
                    key={t.key}
                    t={t}
                    focus={t.id === newSplitId}
                    joined={joined}
                    order={layout.order}
                    customById={customById}
                    answers={custom.data?.answers[t.id]}
                    onSplit={() => addSplit(t.id, t.splitOfId!)}
                    onAttach={() => setAttaching(t)}
                    onEditName={() => setEditing(t)}
                  />
                )
              }
              const kids = t.kind ? 0 : (family.get(t.id)?.rows.length ?? 0)
              const open = isOpen(t.id)
              const splitChip = kids > 0 && (
                <button
                  type="button"
                  onClick={() => toggle(t.id)}
                  disabled={isAgency}
                  title={open ? 'Fold its split rows away' : 'Show its split rows'}
                  className="inline-flex w-fit shrink-0 items-center gap-0.5 rounded-md bg-slate-100 py-0.5 pr-1.5 pl-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
                >
                  {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  {kids} split row{kids === 1 ? '' : 's'}
                </button>
              )
              const description = (
                <span className="line-clamp-2 text-xs break-words [overflow-wrap:anywhere] md:text-sm">
                  {t.kind === 'opening' ? (
                    <Badge variant="secondary">{t.description}</Badge>
                  ) : t.kind === 'fx' ? (
                    <span className="flex flex-col items-start gap-0.5">
                      <Badge variant="secondary">Exchange gain or loss</Badge>
                      <span className="text-muted-foreground">{t.description}</span>
                    </span>
                  ) : (
                    t.description
                  )}
                </span>
              )
              const extras = (
                <span className="flex max-w-full min-w-0 flex-wrap items-center gap-1.5">
                  {t.statementId > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenError(null)
                        openOriginal(auth, t.statementId).catch((e: Error) => setOpenError(e.message))
                      }}
                      className="max-w-full min-w-0 truncate rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground hover:underline"
                      title={`Open the statement PDF — ${t.statementLabel}`}
                    >
                      {t.statementLabel}
                    </button>
                  ) : (
                    <span
                      className="max-w-full min-w-0 truncate rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      title={t.statementLabel}
                    >
                      {t.statementLabel}
                    </span>
                  )}
                  {!t.kind && <AttachButton count={t.attachments?.length ?? 0} onClick={() => setAttaching(t)} />}
                  {!t.kind && <SplitButton onClick={() => addSplit(t.id, t.id)} disabled={duplicate.isPending} />}
                  {!t.kind && <SplitRuleButton t={t} />}
                </span>
              )
              const edit = t.kind ? undefined : () => setEditing(t)
              const cells: Record<string, ReactNode> = {
                date: (
                  <TableCell key="date" className={cn('align-top', edgeClass(layout.order, 'date'))}>
                    <DateStack t={t} />
                  </TableCell>
                ),
                name: (
                  <TableCell
                    key="name"
                    className={cn('align-top font-medium whitespace-normal text-[#0B1C2C]', edgeClass(layout.order, 'name'))}
                    title={t.name ?? undefined}
                  >
                    <span className="block truncate">
                      {t.kind ? (
                        (t.name ?? <span className="text-muted-foreground">—</span>)
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditing(t)}
                          title="Change the name or category"
                          className="max-w-full truncate rounded text-left hover:text-brand hover:underline"
                        >
                          {t.subName?.name ?? t.name ?? <Unclarified />}
                        </button>
                      )}
                    </span>
                    {t.subName && !t.kind && (
                      <span className="block truncate text-[11px] font-normal text-muted-foreground" title="Counted under this name">
                        under {t.name}
                      </span>
                    )}
                    {t.exception && (
                      <span
                        className="block truncate text-[11px] font-normal text-amber-700"
                        title={`Renamed for this transaction only — its description's rule names it ${t.exception.main}`}
                      >
                        exception from {t.exception.main}
                      </span>
                    )}
                    {/* Phone: the description, accounts and statement fold in under the name. */}
                    <span className="mt-1 flex flex-col gap-1 font-normal md:hidden">
                      {splitChip}
                      {description}
                      <AccountStack t={t} onEdit={edit} />
                      {extras}
                    </span>
                  </TableCell>
                ),
                description: (
                  <TableCell
                    key="description"
                    className={cn(MD, 'overflow-hidden align-top whitespace-normal text-[#0B1C2C]', edgeClass(layout.order, 'description'))}
                    title={t.description}
                  >
                    <span className="flex min-w-0 flex-col items-start gap-1">
                      {splitChip}
                      {description}
                    </span>
                  </TableCell>
                ),
                product: (
                  <TableCell key="product" className={cn(MD, 'overflow-hidden align-top', edgeClass(layout.order, 'product'))}>
                    {!t.kind && <ProductCell t={t} />}
                  </TableCell>
                ),
                amount: (
                  <TableCell
                    key="amount"
                    className={cn(
                      'pl-4 text-right align-top font-semibold tabular-nums',
                      t.amount < 0 ? 'text-red-600' : 'text-emerald-700',
                      edgeClass(layout.order, 'amount'),
                    )}
                  >
                    {t.kind === 'fx' ? '—' : money(shownAmount(t))}
                    <FxNote t={t} amount={shownAmount(t)} />
                  </TableCell>
                ),
                debit: (
                  <TableCell key="debit" className={cn(MD, 'overflow-hidden align-top', edgeClass(layout.order, 'debit'))}>
                    {!t.kind && t.debitAccount === t.offsetAccount ? (
                      <TransactionCategoryCell t={t} />
                    ) : (
                      <AccountCell name={t.debitAccount} offset={t.debitAccount === t.offsetAccount} onEdit={edit} />
                    )}
                  </TableCell>
                ),
                credit: (
                  <TableCell key="credit" className={cn(MD, 'overflow-hidden align-top', edgeClass(layout.order, 'credit'))}>
                    {!t.kind && t.creditAccount === t.offsetAccount ? (
                      <TransactionCategoryCell t={t} />
                    ) : (
                      <AccountCell name={t.creditAccount} offset={t.creditAccount === t.offsetAccount} onEdit={edit} />
                    )}
                  </TableCell>
                ),
                statement: (
                  <TableCell key="statement" className={cn(MD, 'overflow-hidden align-top', edgeClass(layout.order, 'statement'))}>
                    {extras}
                  </TableCell>
                ),
              }
              return (
                <TableRow
                  key={t.key}
                  className={cn('group', (t.kind === 'opening' || t.kind === 'fx') && 'bg-muted/40', joined && 'border-b-0')}
                >
                  {layout.order.map((id) => {
                    if (!isCustom(id)) return cells[id]
                    const col = customById.get(customIdOf(id))
                    return (
                      <TableCell key={id} className={cn(MD, 'overflow-hidden align-top', edgeClass(layout.order, id))}>
                        {col && !t.kind && (
                          <CustomCell column={col} answer={custom.data?.answers[t.id]?.[col.id]} transactionId={t.id} />
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
            {hasMore && (
              <TableRow key={`more-${transactions.length}`} ref={setSentinel} className="hover:bg-transparent">
                <TableCell colSpan={layout.order.length + 1} className="py-4 text-center text-xs text-muted-foreground">
                  Showing {transactions.length.toLocaleString()} of {(txCount + splitCount).toLocaleString()} rows — loading more…
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableFooter className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              {(() => {
                // The count sits in the first phone column that is not the amount; "net change"
                // right after the amount (when that column is there).
                const countAt = layout.order.find((id) => id !== 'amount' && id in PHONE)
                const afterAmount = layout.order[layout.order.indexOf('amount') + 1]
                return layout.order.map((id) => {
                  const base = cn(id in PHONE ? '' : MD, edgeClass(layout.order, id))
                  if (id === 'amount') {
                    return (
                      <TableCell
                        key={id}
                        className={cn(base, 'pl-4 text-right font-bold tabular-nums', net < 0 ? 'text-red-600' : 'text-emerald-700')}
                        title="Net change"
                      >
                        {money(net)}
                        {homeNet !== null && (
                          <span className="block text-[11px] font-medium text-muted-foreground" title="In your home currency">
                            = {money(homeNet)}
                          </span>
                        )}
                      </TableCell>
                    )
                  }
                  if (id === countAt) {
                    return (
                      <TableCell key={id} className={cn(base, 'font-medium whitespace-normal')}>
                        {txCount.toLocaleString()} transaction{txCount === 1 ? '' : 's'}
                        {txCount !== allTx && ` of ${allTx.toLocaleString()}`}
                        {splitCount > 0 && (
                          <span className="font-normal text-muted-foreground">
                            {' '}
                            + {splitCount.toLocaleString()} split{splitCount === 1 ? '' : 's'}
                          </span>
                        )}
                      </TableCell>
                    )
                  }
                  return (
                    <TableCell key={id} className={cn(base, 'text-sm text-muted-foreground')}>
                      {id === afterAmount && id !== countAt ? 'net change' : null}
                    </TableCell>
                  )
                })
              })()}
            </TableRow>
          </TableFooter>
        </Table>
        </>
      )}

      <NameRuleDialog
        target={editing && { kind: 'transaction', view: editing }}
        onOpenChange={(o) => !o && setEditing(null)}
      />
      <TransactionAttachmentsDialog transaction={attaching} onOpenChange={(o) => !o && setAttaching(null)} />
      <CustomColumnsDialog
        key={columnsKey}
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
        start={columnsStart}
        rowLabel={rowLabel}
      />

    </div>
  )
}

/**
 * Filter chips use the statement's own label ("Chase 4362 · Sep 2026"). Two statements of
 * the same account and month (a re-upload) would read identically, so those add the file name.
 */
function statementLabels(list: Statement[]): Array<{ id: number; label: string }> {
  const counts = new Map<string, number>()
  list.forEach((s) => counts.set(s.label, (counts.get(s.label) ?? 0) + 1))
  return list.map((s) => ({
    id: s.id,
    label: (counts.get(s.label) ?? 0) > 1 ? `${s.label} · ${s.filename}` : s.label,
  }))
}

/** The outer padding of whichever column comes first / last in the customer's order. */
function edgeClass(order: readonly string[], id: string): string {
  return cn(order[0] === id && 'pl-3 sm:pl-5', order[order.length - 1] === id && 'md:pr-5')
}

const FIXED_LABELS: Record<string, { label: string; kind: 'text' | 'number' | 'date' }> = {
  date: { label: 'Date', kind: 'date' },
  name: { label: 'Name', kind: 'text' },
  description: { label: 'Description', kind: 'text' },
  product: { label: 'Product', kind: 'text' },
  amount: { label: 'Amount', kind: 'number' },
  debit: { label: 'Debit', kind: 'text' },
  credit: { label: 'Credit', kind: 'text' },
  statement: { label: 'Statement', kind: 'text' },
}
const COLUMN_MIME = 'application/x-cyg-ledger-column'

/**
 * step8 (`custom.png`): the headers in the customer's order. Each sorts / filters as before
 * (`ColumnHeader`); drag a header onto another to put it before that one; drag its right
 * edge to make it wider or narrower. Both are remembered in this browser.
 */
function LedgerHeaders({
  layout,
  controls,
  customById,
  onEditColumn,
}: {
  layout: LedgerColumns
  controls: ReturnType<typeof useTableControls>
  customById: Map<number, CustomColumn>
  /** step9 part 3: a custom column's header → "Edit column…". */
  onEditColumn: (id: number) => void
}) {
  const [over, setOver] = useState<string | null>(null)
  const resize = (id: string) => (e: PointerEvent<HTMLSpanElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    let startW = layout.widthOf(id)
    if (layout.fit) {
      // step9: leaving the fitted layout — every column keeps the width it has on screen.
      const cells = Array.from(e.currentTarget.closest('tr')?.children ?? []) as HTMLElement[]
      const measured = Object.fromEntries(
        layout.order.map((c, i) => [c, cells[i]?.getBoundingClientRect().width || layout.widthOf(c)]),
      )
      layout.freeze(measured)
      startW = measured[id]
    }
    const onMove = (ev: globalThis.PointerEvent) => layout.setWidth(id, startW + ev.clientX - startX)
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.removeProperty('cursor')
    }
    document.body.style.cursor = 'col-resize'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  const dragProps = (id: string) => ({
    draggable: true,
    onDragStart: (e: DragEvent<HTMLTableCellElement>) => {
      e.dataTransfer.setData(COLUMN_MIME, id)
      e.dataTransfer.effectAllowed = 'move'
    },
    onDragOver: (e: DragEvent<HTMLTableCellElement>) => {
      if (!e.dataTransfer.types.includes(COLUMN_MIME)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (over !== id) setOver(id)
    },
    onDragLeave: () => setOver((o) => (o === id ? null : o)),
    onDrop: (e: DragEvent<HTMLTableCellElement>) => {
      const from = e.dataTransfer.getData(COLUMN_MIME)
      setOver(null)
      if (from && from !== id) {
        e.preventDefault()
        layout.move(from, id)
      }
    },
  })
  return (
    <>
      {layout.order.map((id) => {
        const col = isCustom(id) ? customById.get(customIdOf(id)) : undefined
        const fixed = FIXED_LABELS[id]
        const label = col?.name ?? fixed?.label ?? ''
        const kind = col ? (col.type === 'NUMBER' ? 'number' : 'text') : (fixed?.kind ?? 'text')
        return (
          <ColumnHeader
            key={id}
            column={id}
            label={label}
            kind={kind}
            align={id === 'amount' ? 'end' : 'start'}
            controls={controls}
            title={`${col ? `${rulesText(col)} — ` : ''}Sort or filter by ${label.toLowerCase()}. Drag to move the column; drag its edge to resize.`}
            className={cn(
              'relative md:cursor-grab',
              id in PHONE ? '' : MD,
              id === 'amount' && 'text-right',
              edgeClass(layout.order, id),
              over === id && 'shadow-[inset_3px_0_0_var(--color-brand)]',
            )}
            thProps={dragProps(id)}
            onEdit={col && (() => onEditColumn(col.id))}
            rules={col && `${rulesText(col)}${col.required ? ' · required' : ''}`}
          >
            <span
              onPointerDown={resize(id)}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-0 right-0 hidden h-full w-2 cursor-col-resize hover:bg-brand/30 md:block"
              aria-hidden
            />
          </ColumnHeader>
        )
      })}
    </>
  )
}

/**
 * A part split off the transaction above — by hand, or by a split rule ("from GST", step9 part 4): indented
 * under it. step2 (2026-11-15): edited right here — amount, name, category and product each in their own cell
 * (`SplitCells`); Split adds one more $0.00 copy of it, Remove takes it out.
 */
function SplitRow({
  t,
  focus,
  joined,
  order,
  customById,
  answers,
  onSplit,
  onAttach,
  onEditName,
}: {
  t: LedgerTransaction
  /** Just made by Split: its amount field takes the focus. */
  focus: boolean
  joined: boolean
  order: readonly string[]
  customById: Map<number, CustomColumn>
  /** step9 (2026-11-19): this split's own answers in the custom columns. */
  answers: CustomColumnsData['answers'][number] | undefined
  onSplit: () => void
  /** step12 (2026-11-19): a split has its own paperclip. */
  onAttach: () => void
  /** step12 (2026-11-20): its name opens the same window as a transaction's (`NameRuleDialog`). */
  onEditName: () => void
}) {
  // step9 (2026-11-17): a split of a split sits further in, under the split it was cut from.
  const indent = { paddingLeft: `${0.5 + (t.depth ?? 0)}rem` }
  const item = (
    <span className="flex min-w-0 items-center gap-1.5">
      {t.splitRule ? (
        <span
          className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-600/20"
          title={`Made by the split rule ${t.splitRule.name} — change it like any split`}
        >
          from {t.splitRule.name}
        </span>
      ) : (
        <span className="shrink-0 rounded-md bg-brand/10 px-1.5 py-0.5 text-[11px] font-medium text-brand">Split</span>
      )}
      <span className="truncate text-xs text-muted-foreground">{t.description}</span>
    </span>
  )
  const actions = (
    <span className="flex flex-wrap items-center gap-1.5">
      <AttachButton count={t.attachments?.length ?? 0} onClick={onAttach} />
      <SplitButton onClick={onSplit} ofSplit />
      <DeleteSplitButton t={t} />
    </span>
  )
  const category = <SplitCategoryCell t={t} />
  const cells: Record<string, ReactNode> = {
    date: (
      <TableCell key="date" className={cn('py-1.5 align-top text-xs text-muted-foreground', edgeClass(order, 'date'))}>
        <DateStack t={t} />
      </TableCell>
    ),
    name: (
      <TableCell
        key="name"
        className={cn('py-1.5 align-top text-sm font-medium whitespace-normal text-[#0B1C2C]', edgeClass(order, 'name'))}
        title={t.subName?.name ?? t.name ?? undefined}
      >
        <span className="block min-w-0" style={(t.depth ?? 0) > 0 ? indent : undefined}>
          <button
            type="button"
            onClick={onEditName}
            title="Change this split's name or category"
            className="max-w-full truncate rounded text-left hover:text-brand hover:underline"
          >
            {t.subName?.name ?? t.name ?? <Unclarified />}
          </button>
          {t.subName && (
            <span className="block truncate text-[11px] font-normal text-muted-foreground" title="Counted under this name">
              under {t.name}
            </span>
          )}
        </span>
        <span className="mt-1 flex flex-col gap-1 font-normal md:hidden">
          {item}
          <ProductCell t={t} />
          {category}
          {actions}
        </span>
      </TableCell>
    ),
    description: (
      <TableCell key="description" className={cn(MD, 'overflow-hidden py-1.5 align-top', edgeClass(order, 'description'))} title={t.description}>
        <span className="flex min-w-0 items-center gap-1.5" style={indent}>
          <CornerDownRight className="size-3.5 shrink-0 text-brand/60" />
          {item}
        </span>
      </TableCell>
    ),
    product: (
      <TableCell key="product" className={cn(MD, 'overflow-hidden py-1.5 align-top', edgeClass(order, 'product'))}>
        <ProductCell t={t} />
      </TableCell>
    ),
    amount: (
      <TableCell key="amount" className={cn('py-1.5 pl-4 text-right align-top text-sm font-semibold tabular-nums', edgeClass(order, 'amount'))}>
        <SplitAmountCell t={t} autoFocus={focus} />
        <FxNote t={t} amount={t.amount} />
      </TableCell>
    ),
    debit: (
      <TableCell key="debit" className={cn(MD, 'overflow-hidden py-1.5 align-top', edgeClass(order, 'debit'))}>
        {t.debitAccount === t.offsetAccount ? category : <AccountCell name={t.debitAccount} offset={false} />}
      </TableCell>
    ),
    credit: (
      <TableCell key="credit" className={cn(MD, 'overflow-hidden py-1.5 align-top', edgeClass(order, 'credit'))}>
        {t.creditAccount === t.offsetAccount ? category : <AccountCell name={t.creditAccount} offset={false} />}
      </TableCell>
    ),
    statement: (
      <TableCell key="statement" className={cn(MD, 'py-1.5 align-top', edgeClass(order, 'statement'))}>
        {actions}
      </TableCell>
    ),
  }
  return (
    <TableRow className={cn('group bg-brand/[0.03] hover:bg-brand/[0.06]', joined && 'border-b-0')}>
      {order.map((id) => {
        if (!isCustom(id)) return cells[id] ?? <TableCell key={id} className={cn(MD, 'py-1.5', edgeClass(order, id))} />
        const col = customById.get(customIdOf(id))
        return (
          <TableCell key={id} className={cn(MD, 'overflow-hidden py-1.5 align-top', edgeClass(order, id))}>
            {col && <CustomCell column={col} answer={answers?.[col.id]} transactionId={t.id} />}
          </TableCell>
        )
      })}
    </TableRow>
  )
}

/**
 * The transaction's attachments: a paperclip with the count when it has some (always
 * visible), otherwise shown on hover to add one.
 */
function AttachButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={count ? 'See its receipts and files' : 'Add a receipt or file'}
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 transition-opacity hover:bg-brand/10',
        count
          ? 'text-brand ring-brand/30'
          : 'text-muted-foreground opacity-0 ring-black/10 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100',
      )}
    >
      <Paperclip className="size-3.5" />
      {count > 0 && count}
    </button>
  )
}

/** Shown on hover: one more split of the row, at $0.00, to fill in place. */
function SplitButton({
  onClick,
  label = 'Split',
  disabled,
  ofSplit = false,
}: {
  onClick: () => void
  label?: string
  disabled?: boolean
  /** step9 (2026-11-17): on a split row the new line is cut from that split. */
  ofSplit?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={
        ofSplit
          ? 'Split this split — a copy of it at $0.00 under it; what you give it comes out of this split'
          : 'Add a split — a copy of this line at $0.00 with its own amount, name, category and product'
      }
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-brand opacity-0 ring-1 ring-brand/30 transition-opacity group-hover:opacity-100 hover:bg-brand/10 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
    >
      <Split className="size-3.5" />
      {label}
    </button>
  )
}

/** Debit over credit in one cell, for screens too narrow for a column each. */
function AccountStack({ t, onEdit }: { t: LedgerTransaction; onEdit?: () => void }) {
  const line = (label: string, name: string) => (
    <span className="flex max-w-full min-w-0 items-center gap-1.5">
      <span className="w-5 shrink-0 text-[10px] font-semibold text-muted-foreground uppercase">{label}</span>
      <AccountCell name={name} offset={name === t.offsetAccount} onEdit={onEdit} />
    </span>
  )
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      {line('Dr', t.debitAccount)}
      {line('Cr', t.creditAccount)}
    </span>
  )
}

/**
 * The AI-chosen (offset) account gets a soft chip; the bank account is plain text. With
 * `onEdit`, the chip is a button that opens the editor for the row's category.
 */
function AccountCell({
  name,
  offset,
  onEdit,
}: {
  name: string
  offset: boolean
  onEdit?: () => void
}) {
  if (offset && onEdit) {
    return (
      <button
        type="button"
        onClick={onEdit}
        title="Change the category"
        className="inline-flex max-w-full truncate rounded-md bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand ring-brand/40 hover:bg-brand/15 hover:ring-1"
      >
        {name}
      </button>
    )
  }
  return offset ? (
    <span className="inline-flex max-w-full truncate rounded-md bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
      {name}
    </span>
  ) : (
    <span className="truncate text-sm text-[#0B1C2C]">{name}</span>
  )
}

/**
 * A foreign-currency row: its currency, and under it the amount in the home currency at the
 * day's rate (a folded transaction converts its full amount at the same rate). A
 * revaluation row (`fx`) shows only its home-currency difference.
 */
function FxNote({ t, amount }: { t: LedgerTransaction; amount: number }) {
  if (!t.currency) return null
  const rate = t.fxRate
  const home = t.kind === 'fx' ? (t.homeAmount ?? 0) : rate != null ? Math.round(amount * 100 * rate) / 100 : null
  return (
    <span className="mt-0.5 block text-[11px] leading-tight font-normal text-muted-foreground">
      {t.kind !== 'fx' && <span className="mr-1">{t.currency}</span>}
      {home === null ? (
        <span title="No exchange rate known for this day yet">no rate yet</span>
      ) : (
        <span title={rate != null ? `Rate ${rate.toFixed(4)}` : undefined}>
          = <span className={cn('font-medium', home < 0 ? 'text-red-600' : 'text-emerald-700')}>{money(home)}</span>
        </span>
      )}
    </span>
  )
}

/** A row the AI found no payee name for. Nothing is stored — the ledger just says so. */
function Unclarified() {
  return <span className="font-normal text-muted-foreground italic">{UNCLARIFIED_NAME}</span>
}
