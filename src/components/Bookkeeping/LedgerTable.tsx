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
  Search,
  Split,
} from 'lucide-react'
import { openOriginal, UNCLARIFIED_NAME, type LedgerTransaction, type Statement } from '@/api/bookkeeping'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { CustomColumn, CustomColumnsData } from '@/api/customColumns'
import { useBook } from '@/hooks/useBook'
import { useCustomColumns } from '@/hooks/useCustomColumns'
import { useLedgerColumns, type LedgerColumns } from '@/hooks/useLedgerColumns'
import { useIncrementalRows } from '@/hooks/useIncrementalRows'
import { money } from '@/lib/money'
import { applyTable, useTableControls, type ColumnDef, type SortState } from '@/lib/table-sort'
import { rulesText } from '@/lib/custom-columns'
import { cn } from '@/lib/utils'
import { ColumnHeader } from './ColumnHeader'
import { CustomCell } from './CustomCell'
import { CustomColumnsDialog } from './CustomColumnsDialog'
import { NameRuleDialog } from './NameRuleDialog'
import { SplitDialog, type SplitTarget } from './SplitDialog'
import { StickyScrollbar } from './StickyScrollbar'
import { TaxLineNameDialog } from './TaxLineNameDialog'
import { TransactionAttachmentsDialog } from './TransactionAttachmentsDialog'
import { folderOf, groupByAccount } from './statement-folders'

/** A row's payee as the Name column shows it; a starting balance has none. */
const nameOf = (t: LedgerTransaction): string | null =>
  t.kind === 'opening' ? null : (t.name ?? UNCLARIFIED_NAME)

/** Date-only ISO → "Sep 2, 2026", parsed as LOCAL midnight so it never slips a day. */
const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

const toCents = (n: number) => Math.round(n * 100)

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
const isCustom = (id: string) => id.startsWith('c')
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

/** A custom column's answer as text (the option's label for a dropdown) — for sorting and filtering. */
function answerText(col: CustomColumn, data: CustomColumnsData | undefined, transactionId: number): string | null {
  const a = data?.answers[transactionId]?.[col.id]
  if (!a) return null
  if (col.type === 'DROPDOWN') return col.options.find((o) => o.id === a.dropDownId)?.label ?? null
  return a.value
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
 * A tax line (`kind: 'tax'`) sits directly under the transaction it taxes: indented,
 * lighter, joined to it without a divider. The tax is INCLUDED in the bank amount: the
 * transaction shows its amount without tax and the two add back to what the bank moved.
 * A transaction can also be SPLIT by hand (hover → Split): each split (`kind: 'split'`) sits
 * under it with its own name, category and tax lines, and the transaction shows what is left.
 * Each transaction's split rows (tax lines and splits) fold away on their own (the chip with
 * their count) or all at once; folded, it shows its full bank amount again (view only —
 * downloads always include them). The net change is the same either way.
 * A tax line's and a split's name can be clicked to change it.
 * The paperclip on a transaction opens its receipts, cheques and voice notes; `focusId`
 * shows one transaction only (from "View transaction" on an attachment); `name` the rows of
 * one payee (from the Names tab or the income statement).
 * One fetch, rendered while scrolling (`useIncrementalRows`, step12): 100 rows, then 100
 * more as the end comes into view — filters, sort and the footer totals still cover every
 * row. Each column header sorts and filters its own column
 * (`ColumnHeader`); a transaction moves together with its tax lines and splits, judged by
 * the transaction itself.
 */
export function LedgerTable({
  transactions,
  statements,
  loading,
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
}: {
  transactions: LedgerTransaction[]
  statements: Statement[]
  loading: boolean
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
}) {
  const [query, setQuery] = useState('')
  const ranged = !!(from || to)
  // A row's date as the reports count it: posted, else pending, else its statement's end.
  // Undated rows fall outside any range, as they do in the reports.
  const periodEnd = useMemo(
    () => new Map(statements.map((s) => [s.id, s.periodEnd?.slice(0, 10) ?? null])),
    [statements],
  )
  const inRange = (t: LedgerTransaction) => {
    if (!ranged) return true
    const day = (t.postingDate ?? t.pendingDate)?.slice(0, 10) ?? periodEnd.get(t.statementId) ?? null
    return !!day && (!from || day >= from) && (!to || day <= to)
  }
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
  const [renaming, setRenaming] = useState<LedgerTransaction | null>(null)
  const [splitting, setSplitting] = useState<SplitTarget | null>(null)
  const [attaching, setAttaching] = useState<LedgerTransaction | null>(null)
  const { auth } = useBook()
  const [openError, setOpenError] = useState<string | null>(null)

  const done = statements.filter((s) => s.status === 'DONE')
  const folders = useMemo(() => groupByAccount(statements.filter((s) => s.status === 'DONE')), [statements])
  const folder = folderName === 'all' ? null : (folders.find((f) => f.account === folderName) ?? null)
  const folderIds = useMemo(() => (folder ? new Set(folder.statements.map((s) => s.id)) : null), [folder])
  // One account: its statements are the chips, as before. Several: pick an account first.
  const statementChips = folders.length > 1 ? (folder?.statements ?? []) : done
  // An agency's own ledger is nothing but tax lines: never fold them there.
  const isAgency = useMemo(
    () => !!account && transactions.some((t) => t.kind === 'tax' && t.offsetAccount === account),
    [transactions, account],
  )
  // Per transaction: its split rows (tax lines, splits, the splits' tax lines) and their sum
  // in cents — added back onto it while they are folded away.
  const family = useMemo(() => {
    const m = new Map<number, { rows: LedgerTransaction[]; cents: number }>()
    for (const t of transactions) {
      if (t.kind !== 'tax' && t.kind !== 'split') continue
      const top = t.splitOfId ?? t.id
      const f = m.get(top) ?? { rows: [], cents: 0 }
      f.rows.push(t)
      f.cents += toCents(t.amount)
      m.set(top, f)
    }
    return m
  }, [transactions])
  const isOpen = (id: number) => isAgency || !collapsed.has(id)
  const shownAmount = (t: LedgerTransaction) =>
    !t.kind && !isOpen(t.id) ? (toCents(t.amount) + (family.get(t.id)?.cents ?? 0)) / 100 : t.amount
  const toggle = (id: number) =>
    setCollapsed((s) => {
      const next = new Set(s)
      if (!next.delete(id)) next.add(id)
      return next
    })
  const anyOpen = [...family.keys()].some((id) => !collapsed.has(id))

  /** The split dialog for a transaction: its full bank amount and its splits at their full amounts. */
  const openSplit = (parentId: number) => {
    const parent = transactions.find((t) => !t.kind && t.id === parentId)
    if (!parent) return
    const kin = family.get(parentId)
    const taxOf = (id: number) =>
      (kin?.rows ?? []).filter((r) => r.kind === 'tax' && r.id === id).reduce((n, r) => n + toCents(r.amount), 0)
    setSplitting({
      id: parent.id,
      name: parent.name,
      description: parent.description,
      bankAmount: (toCents(parent.amount) + (kin?.cents ?? 0)) / 100,
      category: parent.offsetAccount,
      splits: (kin?.rows ?? [])
        .filter((r) => r.kind === 'split')
        .map((r) => ({
          id: r.id,
          name: r.name,
          itemName: r.itemName ?? null,
          category: r.offsetAccount,
          amount: Math.abs(toCents(r.amount) + taxOf(r.id)) / 100,
        })),
      receipts: (parent.attachments ?? [])
        .filter((a) => a.kind === 'RECEIPT')
        .map((a) => ({ id: a.id, filename: a.filename })),
    })
  }

  const custom = useCustomColumns()
  const customColumns = useMemo(() => custom.data?.columns ?? [], [custom.data])
  const customById = useMemo(() => new Map(customColumns.map((c) => [c.id, c])), [customColumns])
  const customIds = useMemo(() => customColumns.map((c) => c.id), [customColumns])
  const layout = useLedgerColumns(customIds)
  const [columnsOpen, setColumnsOpen] = useState(false)

  const columns = useMemo<ColumnDef<LedgerTransaction>[]>(
    () => [
      // step8: the posting date is THE date (sorted by it, like the reports).
      { key: 'date', kind: 'date', value: (t) => t.postingDate ?? t.pendingDate },
      { key: 'name', kind: 'text', value: nameOf },
      { key: 'description', kind: 'text', value: (t) => [t.description, t.itemName ?? null] },
      { key: 'amount', kind: 'number', value: (t) => shownAmount(t) },
      { key: 'debit', kind: 'text', value: (t) => t.debitAccount },
      { key: 'credit', kind: 'text', value: (t) => t.creditAccount },
      { key: 'statement', kind: 'text', value: (t) => t.statementLabel },
      ...customColumns.map(
        (c): ColumnDef<LedgerTransaction> => ({
          key: `c${c.id}`,
          kind: c.type === 'NUMBER' ? 'number' : 'text',
          value: (t) => {
            const v = t.kind ? null : answerText(c, custom.data, t.id)
            return c.type === 'NUMBER' ? (v == null || v === '' ? null : Number(v.replace(',', '.'))) : v
          },
        }),
      ),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [family, collapsed, isAgency, customColumns, custom.data],
  )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const wanted = name?.trim().toLowerCase()
    const kept = transactions.filter(
      (t) =>
        (isAgency || (t.kind !== 'tax' && t.kind !== 'split') || !collapsed.has(t.splitOfId ?? t.id)) &&
        (focusId == null || t.id === focusId || t.splitOfId === focusId) &&
        (!folderIds || folderIds.has(t.statementId)) &&
        (statementId === 'all' || t.statementId === statementId) &&
        inRange(t) &&
        (!account || t.debitAccount === account || t.creditAccount === account) &&
        (!q ||
          t.description.toLowerCase().includes(q) ||
          t.name?.toLowerCase().includes(q) ||
          t.itemName?.toLowerCase().includes(q) ||
          t.debitAccount.toLowerCase().includes(q) ||
          t.creditAccount.toLowerCase().includes(q)),
    )
    // A transaction and the tax lines / splits under it move as one family.
    const groups: LedgerTransaction[][] = []
    const at = new Map<number, LedgerTransaction[]>()
    for (const t of kept) {
      const top = t.kind === 'tax' || t.kind === 'split' ? (t.splitOfId ?? t.id) : null
      const g = top !== null ? at.get(top) : undefined
      if (g) {
        g.push(t)
        continue
      }
      const fresh = [t]
      groups.push(fresh)
      if (!t.kind || t.kind === 'tax' || t.kind === 'split') at.set(top ?? t.id, fresh)
    }
    const named = wanted
      ? groups.filter((g) => g.some((t) => nameOf(t)?.toLowerCase() === wanted))
      : groups
    const heads = named.map((g) => ({ head: g.find((t) => !t.kind) ?? g[0], g }))
    const byHead = new Map(heads.map((h) => [h.head, h.g]))
    return applyTable(
      heads.map((h) => h.head),
      columns,
      controls.filters,
      controls.sort,
    ).flatMap((head) => byHead.get(head) ?? [head])
    // eslint-disable-next-line react-hooks/exhaustive-deps -- inRange reads from, to, periodEnd
  }, [transactions, query, statementId, folderIds, account, collapsed, isAgency, focusId, name, from, to, periodEnd, columns, controls.filters, controls.sort])
  const net = rows.reduce((cents, t) => cents + toCents(shownAmount(t)), 0) / 100
  // With foreign statements, the net change in the home currency too (rows converted, plus
  // the revaluations). Home-currency rows count as they are.
  const foreign = rows.some((t) => t.currency)
  const homeNet = foreign
    ? rows.reduce(
        (cents, t) =>
          cents +
          (t.kind === 'fx'
            ? toCents(t.homeAmount ?? 0)
            : t.currency && t.fxRate != null
              ? Math.round(toCents(shownAmount(t)) * t.fxRate)
              : toCents(shownAmount(t))),
        0,
      ) / 100
    : null
  // Rendered while scrolling; a new filter or sort starts from the top again.
  const { shown, hasMore, sentinelRef } = useIncrementalRows(
    rows,
    JSON.stringify([query, statementId, folderName, account, focusId, name, from, to, controls.filters, controls.sort]),
    (t) => t.kind === 'tax' || t.kind === 'split',
  )
  const taxCount = rows.filter((t) => t.kind === 'tax').length
  const splitCount = rows.filter((t) => t.kind === 'split').length
  const txCount = rows.length - taxCount - splitCount
  const allTx = useMemo(
    () => transactions.filter((t) => t.kind !== 'tax' && t.kind !== 'split').length,
    [transactions],
  )

  // The table's own sideways scroller (shadcn's `table-container`), mirrored at the top of
  // the screen by `StickyScrollbar`. Looked up after each render: the table comes and goes
  // with loading / an empty ledger.
  const [card, setCard] = useState<HTMLDivElement | null>(null)
  const [scroller, setScroller] = useState<HTMLElement | null>(null)
  const hasTable = !loading && transactions.length > 0
  useEffect(() => {
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
        {ranged && (
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
            onClick={() => setColumnsOpen(true)}
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

      {loading ? (
        <div className="flex flex-col gap-2 p-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : !transactions.length ? (
        <div className="px-6 py-16 text-center">
          <p className="font-medium text-[#0B1C2C]">Your ledger is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a bank statement and every transaction will appear here, posted as a debit and a credit.
          </p>
        </div>
      ) : (
        <>
        <StickyScrollbar target={scroller} />
        <Table
          className="table-fixed md:w-(--tw) md:min-w-full"
          style={{ '--tw': `${layout.total}px` } as CSSProperties}
        >
          <colgroup>
            {layout.order.map((id) => (
              <col
                key={id}
                className={cn(id in PHONE ? PHONE[id] : 'hidden md:table-column', 'md:w-(--w)')}
                style={{ '--w': `${layout.widthOf(id)}px` } as CSSProperties}
              />
            ))}
          </colgroup>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <LedgerHeaders layout={layout} controls={controls} customById={customById} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((t, i, page) => {
              // Joined to its split rows: no divider between them.
              const joined = page[i + 1]?.kind === 'tax' || page[i + 1]?.kind === 'split'
              if (t.kind === 'tax') {
                return <TaxRow key={t.key} t={t} joined={joined} order={layout.order} onRename={() => setRenaming(t)} />
              }
              if (t.kind === 'split') {
                return (
                  <SplitRow
                    key={t.key}
                    t={t}
                    joined={joined}
                    order={layout.order}
                    onEdit={() => setEditing(t)}
                    onSplit={() => openSplit(t.splitOfId!)}
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
                  {!t.kind && <SplitButton onClick={() => openSplit(t.id)} />}
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
                          {t.name ?? <Unclarified />}
                        </button>
                      )}
                    </span>
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
                    <AccountCell name={t.debitAccount} offset={t.debitAccount === t.offsetAccount} onEdit={edit} />
                  </TableCell>
                ),
                credit: (
                  <TableCell key="credit" className={cn(MD, 'overflow-hidden align-top', edgeClass(layout.order, 'credit'))}>
                    <AccountCell name={t.creditAccount} offset={t.creditAccount === t.offsetAccount} onEdit={edit} />
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
              <TableRow key={`more-${shown.length}`} ref={sentinelRef} className="hover:bg-transparent">
                <TableCell colSpan={layout.order.length} className="py-4 text-center text-xs text-muted-foreground">
                  Showing {shown.length.toLocaleString()} of {rows.length.toLocaleString()} rows — loading more…
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
                        {taxCount > 0 && (
                          <span className="font-normal text-muted-foreground">
                            {' '}
                            + {taxCount.toLocaleString()} tax line{taxCount === 1 ? '' : 's'}
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
      <TaxLineNameDialog line={renaming} onOpenChange={(o) => !o && setRenaming(null)} />
      <SplitDialog target={splitting} onOpenChange={(o) => !o && setSplitting(null)} />
      <TransactionAttachmentsDialog transaction={attaching} onOpenChange={(o) => !o && setAttaching(null)} />
      <CustomColumnsDialog open={columnsOpen} onOpenChange={setColumnsOpen} />

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
}: {
  layout: LedgerColumns
  controls: ReturnType<typeof useTableControls>
  customById: Map<number, CustomColumn>
}) {
  const [over, setOver] = useState<string | null>(null)
  const resize = (id: string) => (e: PointerEvent<HTMLSpanElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = layout.widthOf(id)
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
 * A tax line, under the row it taxes: same dates, lighter, indented with a hook arrow and the
 * agency + rate, the amount in neutral grey (the tax taken out of the row above). Its name —
 * the row's, until the customer gives it its own — can be clicked to change it.
 */
function TaxRow({
  t,
  joined,
  order,
  onRename,
}: {
  t: LedgerTransaction
  joined: boolean
  order: readonly string[]
  onRename: () => void
}) {
  const agency = (
    <span className="w-fit max-w-full shrink-0 truncate rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-600/20">
      {t.offsetAccount}
      {t.taxRate !== undefined && ` · ${t.taxRate.toLocaleString(undefined, { maximumFractionDigits: 3 })}%`}
    </span>
  )
  const cells: Record<string, ReactNode> = {
    date: (
      <TableCell key="date" className={cn('py-1.5 align-top text-xs', edgeClass(order, 'date'))}>
        <DateStack t={t} />
      </TableCell>
    ),
    name: (
      <TableCell key="name" className={cn('py-1.5 align-top text-xs whitespace-normal', edgeClass(order, 'name'))} title={t.name ?? undefined}>
        <span className="block truncate">
          {t.taxAgencyId !== undefined ? (
            <button
              type="button"
              onClick={onRename}
              title="Change this tax line's name"
              className="max-w-full truncate rounded text-left hover:text-brand hover:underline"
            >
              {t.name ?? <span className="text-slate-400">Add name</span>}
            </button>
          ) : (
            t.name
          )}
        </span>
        <span className="mt-1 flex flex-col gap-1 md:hidden">
          {agency}
          <AccountStack t={t} tax />
        </span>
      </TableCell>
    ),
    description: (
      <TableCell
        key="description"
        className={cn(MD, 'overflow-hidden py-1.5 align-top', edgeClass(order, 'description'))}
        title={`${t.offsetAccount} on: ${t.description}`}
      >
        <span className={cn('flex min-w-0 items-center gap-1.5', t.splitOfId ? 'pl-6' : 'pl-2')}>
          <CornerDownRight className="size-3.5 shrink-0 text-slate-400" />
          {agency}
          <span className="truncate text-xs">{t.description}</span>
        </span>
      </TableCell>
    ),
    amount: (
      <TableCell key="amount" className={cn('py-1.5 pl-4 text-right align-top text-sm font-medium tabular-nums', edgeClass(order, 'amount'))}>
        {money(t.amount)}
        <FxNote t={t} amount={t.amount} />
      </TableCell>
    ),
    debit: (
      <TableCell key="debit" className={cn(MD, 'overflow-hidden py-1.5 align-top', edgeClass(order, 'debit'))}>
        <AccountCell name={t.debitAccount} offset={t.debitAccount === t.offsetAccount} tax />
      </TableCell>
    ),
    credit: (
      <TableCell key="credit" className={cn(MD, 'overflow-hidden py-1.5 align-top', edgeClass(order, 'credit'))}>
        <AccountCell name={t.creditAccount} offset={t.creditAccount === t.offsetAccount} tax />
      </TableCell>
    ),
  }
  return (
    <TableRow className={cn('bg-slate-50/80 text-slate-500 hover:bg-slate-100/70', joined && 'border-b-0')}>
      {order.map((id) => cells[id] ?? <TableCell key={id} className={cn(MD, 'py-1.5', edgeClass(order, id))} />)}
    </TableRow>
  )
}

/**
 * A part split off the transaction above by hand: indented under it, with its own name and
 * category (both clickable, for this split only) and its own tax lines below it.
 */
function SplitRow({
  t,
  joined,
  order,
  onEdit,
  onSplit,
}: {
  t: LedgerTransaction
  joined: boolean
  order: readonly string[]
  onEdit: () => void
  onSplit: () => void
}) {
  const item = (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 rounded-md bg-brand/10 px-1.5 py-0.5 text-[11px] font-medium text-brand">Split</span>
      {t.itemName && <span className="max-w-[50%] shrink-0 truncate text-xs font-medium text-[#0B1C2C]">{t.itemName}</span>}
      <span className="truncate text-xs text-muted-foreground">{t.description}</span>
    </span>
  )
  const edit = <SplitButton onClick={onSplit} label="Edit splits" />
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
        title={t.name ?? undefined}
      >
        <span className="block truncate">
          <button
            type="button"
            onClick={onEdit}
            title="Change this split's name or category"
            className="max-w-full truncate rounded text-left hover:text-brand hover:underline"
          >
            {t.name ?? <Unclarified />}
          </button>
        </span>
        <span className="mt-1 flex flex-col gap-1 font-normal md:hidden">
          {item}
          <AccountStack t={t} onEdit={onEdit} />
          {edit}
        </span>
      </TableCell>
    ),
    description: (
      <TableCell key="description" className={cn(MD, 'overflow-hidden py-1.5 align-top', edgeClass(order, 'description'))} title={t.description}>
        <span className="flex min-w-0 items-center gap-1.5 pl-2">
          <CornerDownRight className="size-3.5 shrink-0 text-brand/60" />
          {item}
        </span>
      </TableCell>
    ),
    amount: (
      <TableCell
        key="amount"
        className={cn(
          'py-1.5 pl-4 text-right align-top text-sm font-semibold tabular-nums',
          t.amount < 0 ? 'text-red-600' : 'text-emerald-700',
          edgeClass(order, 'amount'),
        )}
      >
        {money(t.amount)}
        <FxNote t={t} amount={t.amount} />
      </TableCell>
    ),
    debit: (
      <TableCell key="debit" className={cn(MD, 'overflow-hidden py-1.5 align-top', edgeClass(order, 'debit'))}>
        <AccountCell name={t.debitAccount} offset={t.debitAccount === t.offsetAccount} onEdit={onEdit} />
      </TableCell>
    ),
    credit: (
      <TableCell key="credit" className={cn(MD, 'overflow-hidden py-1.5 align-top', edgeClass(order, 'credit'))}>
        <AccountCell name={t.creditAccount} offset={t.creditAccount === t.offsetAccount} onEdit={onEdit} />
      </TableCell>
    ),
    statement: (
      <TableCell key="statement" className={cn(MD, 'py-1.5 align-top', edgeClass(order, 'statement'))}>
        {edit}
      </TableCell>
    ),
  }
  return (
    <TableRow className={cn('group bg-brand/[0.03] hover:bg-brand/[0.06]', joined && 'border-b-0')}>
      {order.map((id) => cells[id] ?? <TableCell key={id} className={cn(MD, 'py-1.5', edgeClass(order, id))} />)}
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

/** Shown on hover: open the split dialog for the row's transaction. */
function SplitButton({ onClick, label = 'Split' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Split this transaction into parts with their own name and category"
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-brand opacity-0 ring-1 ring-brand/30 transition-opacity group-hover:opacity-100 hover:bg-brand/10 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
    >
      <Split className="size-3.5" />
      {label}
    </button>
  )
}

/** Debit over credit in one cell, for screens too narrow for a column each. */
function AccountStack({ t, tax, onEdit }: { t: LedgerTransaction; tax?: boolean; onEdit?: () => void }) {
  const line = (label: string, name: string) => (
    <span className="flex max-w-full min-w-0 items-center gap-1.5">
      <span className="w-5 shrink-0 text-[10px] font-semibold text-muted-foreground uppercase">{label}</span>
      <AccountCell name={name} offset={name === t.offsetAccount} tax={tax} onEdit={onEdit} />
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
  tax,
  onEdit,
}: {
  name: string
  offset: boolean
  tax?: boolean
  onEdit?: () => void
}) {
  if (tax) {
    // On a tax line the agency is the chip (amber, like its label); the account the tax
    // is taken from is plain grey text.
    return offset ? (
      <span className="inline-flex max-w-full truncate rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-600/20">
        {name}
      </span>
    ) : (
      <span className="truncate text-xs text-slate-500">{name}</span>
    )
  }
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
