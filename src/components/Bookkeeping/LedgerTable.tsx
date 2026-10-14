import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  CornerDownRight,
  Paperclip,
  Search,
  Split,
} from 'lucide-react'
import type { LedgerTransaction, Statement } from '@/api/bookkeeping'
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
import { money } from '@/lib/money'
import { cn } from '@/lib/utils'
import { NameRuleDialog } from './NameRuleDialog'
import { SplitDialog, type SplitTarget } from './SplitDialog'
import { TaxLineNameDialog } from './TaxLineNameDialog'
import { TransactionAttachmentsDialog } from './TransactionAttachmentsDialog'

/** Rows rendered at once. A year of statements is thousands of rows; more load on demand. */
const PAGE = 200

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
 * Which columns a screen size shows. The table is `table-fixed`, so it is never wider than
 * the dialog: what does not fit folds into a neighbouring cell instead of scrolling.
 * - xl+: every column (Date · Name · Description · Amount · Debit · Credit · Statement);
 * - md–xl: Debit and Credit share one stacked cell, the statement chip and the row's
 *   buttons sit under the description;
 * - phone: Date · Name · Amount — the description, accounts and statement under the name.
 * Every row kind (transaction, tax line, split) and the footer use the same classes.
 */
const SHOW = {
  desc: 'hidden md:table-cell',
  stacked: 'hidden md:table-cell xl:hidden',
  wide: 'hidden xl:table-cell',
}

/** Pending date, with the posting date under it when the bank printed a different one. */
function DateStack({ t }: { t: LedgerTransaction }) {
  const pending = fmtDate(t.pendingDate)
  const posting = fmtDate(t.postingDate)
  return (
    <span className="flex flex-col whitespace-normal text-muted-foreground">
      <span>{pending || posting}</span>
      {pending && posting && posting !== pending && (
        <span className="text-[11px] leading-tight text-muted-foreground/80" title="Posting date">
          posted {posting}
        </span>
      )}
    </span>
  )
}

/**
 * The ledger in the firm's own columns: date (pending, with the posting date under it), name,
 * description, amount, debit, credit — never wider than the screen (`SHOW`). The bank account sits on one side of every row and the AI-chosen
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
 * shows one transaction only (from "View transaction" on an attachment).
 */
export function LedgerTable({
  transactions,
  statements,
  loading,
  account,
  onClearAccount,
  focusId,
  onClearFocus,
}: {
  transactions: LedgerTransaction[]
  statements: Statement[]
  loading: boolean
  account?: string | null
  onClearAccount?: () => void
  focusId?: number | null
  onClearFocus?: () => void
}) {
  const [query, setQuery] = useState('')
  const [statementId, setStatementId] = useState<number | 'all'>('all')
  const [shown, setShown] = useState(PAGE)
  // The transactions whose split rows are folded away.
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(new Set())
  const [editing, setEditing] = useState<LedgerTransaction | null>(null)
  const [renaming, setRenaming] = useState<LedgerTransaction | null>(null)
  const [splitting, setSplitting] = useState<SplitTarget | null>(null)
  const [attaching, setAttaching] = useState<LedgerTransaction | null>(null)

  const done = statements.filter((s) => s.status === 'DONE')
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

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return transactions.filter(
      (t) =>
        (isAgency || (t.kind !== 'tax' && t.kind !== 'split') || !collapsed.has(t.splitOfId ?? t.id)) &&
        (focusId == null || t.id === focusId || t.splitOfId === focusId) &&
        (statementId === 'all' || t.statementId === statementId) &&
        (!account || t.debitAccount === account || t.creditAccount === account) &&
        (!q ||
          t.description.toLowerCase().includes(q) ||
          t.name?.toLowerCase().includes(q) ||
          t.itemName?.toLowerCase().includes(q) ||
          t.debitAccount.toLowerCase().includes(q) ||
          t.creditAccount.toLowerCase().includes(q)),
    )
  }, [transactions, query, statementId, account, collapsed, isAgency, focusId])
  const net = rows.reduce((cents, t) => cents + toCents(shownAmount(t)), 0) / 100
  const taxCount = rows.filter((t) => t.kind === 'tax').length
  const splitCount = rows.filter((t) => t.kind === 'split').length
  const txCount = rows.length - taxCount - splitCount
  const allTx = useMemo(
    () => transactions.filter((t) => t.kind !== 'tax' && t.kind !== 'split').length,
    [transactions],
  )

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      <div className="flex flex-col gap-3 border-b px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-5 sm:py-4">
        <div className="relative w-full shrink-0 sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShown(PAGE)
            }}
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
        {done.length > 1 && (
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {[{ id: 'all' as const, label: 'All statements' }, ...statementLabels(done)].map(
              (opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setStatementId(opt.id)
                    setShown(PAGE)
                  }}
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
        {family.size > 0 && !isAgency && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCollapsed(anyOpen ? new Set(family.keys()) : new Set())}
            className="h-9 shrink-0 gap-1.5 sm:ml-auto"
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
        <Table className="table-fixed">
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[5.5rem] pl-3 sm:w-28 sm:pl-5">Date</TableHead>
              <TableHead className="md:w-[18%]">Name</TableHead>
              <TableHead className={SHOW.desc}>Description</TableHead>
              <TableHead className="w-[6.5rem] text-right sm:w-28">Amount</TableHead>
              <TableHead className={cn(SHOW.stacked, 'w-44')}>Debit / Credit</TableHead>
              <TableHead className={cn(SHOW.wide, 'w-40')}>Debit</TableHead>
              <TableHead className={cn(SHOW.wide, 'w-40')}>Credit</TableHead>
              <TableHead className={cn(SHOW.wide, 'w-44 pr-5')}>Statement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, shown).map((t, i, page) => {
              // Joined to its split rows: no divider between them.
              const joined = page[i + 1]?.kind === 'tax' || page[i + 1]?.kind === 'split'
              if (t.kind === 'tax') {
                return <TaxRow key={t.key} t={t} joined={joined} onRename={() => setRenaming(t)} />
              }
              if (t.kind === 'split') {
                return (
                  <SplitRow
                    key={t.key}
                    t={t}
                    joined={joined}
                    onEdit={() => setEditing(t)}
                    onSplit={() => openSplit(t.splitOfId!)}
                  />
                )
              }
              const kids = t.kind ? 0 : (family.get(t.id)?.rows.length ?? 0)
              const open = isOpen(t.id)
              // Each is placed once per screen size: in its own column when there is room,
              // else folded under the description (tablet) or the name (phone).
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
                <span className="line-clamp-2 text-xs break-words md:text-sm">
                  {t.kind === 'opening' ? <Badge variant="secondary">{t.description}</Badge> : t.description}
                </span>
              )
              const extras = (
                <span className="flex max-w-full min-w-0 items-center gap-1.5">
                  <span
                    className="min-w-0 truncate rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    title={t.statementLabel}
                  >
                    {t.statementLabel}
                  </span>
                  {!t.kind && <AttachButton count={t.attachments?.length ?? 0} onClick={() => setAttaching(t)} />}
                  {!t.kind && <SplitButton onClick={() => openSplit(t.id)} />}
                </span>
              )
              return (
                <TableRow
                  key={t.key}
                  className={cn('group', t.kind === 'opening' && 'bg-muted/40', joined && 'border-b-0')}
                >
                  <TableCell className="pl-3 align-top sm:pl-5">
                    <DateStack t={t} />
                  </TableCell>
                  <TableCell className="align-top font-medium whitespace-normal text-[#0B1C2C]" title={t.name ?? undefined}>
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
                          {t.name ?? <span className="text-muted-foreground">Add name</span>}
                        </button>
                      )}
                    </span>
                    {/* Phone: the description, accounts and statement fold in under the name. */}
                    <span className="mt-1 flex flex-col gap-1 font-normal md:hidden">
                      {splitChip}
                      {description}
                      <AccountStack t={t} onEdit={t.kind ? undefined : () => setEditing(t)} />
                      {extras}
                    </span>
                  </TableCell>
                  <TableCell className={cn(SHOW.desc, 'align-top whitespace-normal text-[#0B1C2C]')} title={t.description}>
                    <span className="flex min-w-0 flex-col items-start gap-1">
                      {splitChip}
                      {description}
                      <span className="flex max-w-full min-w-0 xl:hidden">{extras}</span>
                    </span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right align-top font-semibold tabular-nums',
                      t.amount < 0 ? 'text-red-600' : 'text-emerald-700',
                    )}
                  >
                    {money(shownAmount(t))}
                  </TableCell>
                  <TableCell className={cn(SHOW.stacked, 'align-top')}>
                    <AccountStack t={t} onEdit={t.kind ? undefined : () => setEditing(t)} />
                  </TableCell>
                  <TableCell className={cn(SHOW.wide, 'align-top')}>
                    <AccountCell
                      name={t.debitAccount}
                      offset={t.debitAccount === t.offsetAccount}
                      onEdit={t.kind ? undefined : () => setEditing(t)}
                    />
                  </TableCell>
                  <TableCell className={cn(SHOW.wide, 'align-top')}>
                    <AccountCell
                      name={t.creditAccount}
                      offset={t.creditAccount === t.offsetAccount}
                      onEdit={t.kind ? undefined : () => setEditing(t)}
                    />
                  </TableCell>
                  <TableCell className={cn(SHOW.wide, 'pr-5 align-top')}>{extras}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
          <TableFooter className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={2} className="pl-3 font-medium whitespace-normal sm:pl-5">
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
              <TableCell className={SHOW.desc} />
              <TableCell
                className={cn('text-right font-bold tabular-nums', net < 0 ? 'text-red-600' : 'text-emerald-700')}
                title="Net change"
              >
                {money(net)}
              </TableCell>
              <TableCell className={cn(SHOW.stacked, 'text-sm text-muted-foreground')}>net change</TableCell>
              <TableCell colSpan={3} className={cn(SHOW.wide, 'pr-5 text-sm text-muted-foreground')}>
                net change
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )}

      <NameRuleDialog
        target={editing && { kind: 'transaction', view: editing }}
        onOpenChange={(o) => !o && setEditing(null)}
      />
      <TaxLineNameDialog line={renaming} onOpenChange={(o) => !o && setRenaming(null)} />
      <SplitDialog target={splitting} onOpenChange={(o) => !o && setSplitting(null)} />
      <TransactionAttachmentsDialog transaction={attaching} onOpenChange={(o) => !o && setAttaching(null)} />

      {rows.length > shown && (
        <div className="border-t p-3 text-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE)}
            className="text-sm font-medium text-brand hover:underline"
          >
            Show {Math.min(PAGE, rows.length - shown)} more
          </button>
        </div>
      )}
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

/**
 * A tax line, under the row it taxes: same dates, lighter, indented with a hook arrow and the
 * agency + rate, the amount in neutral grey (the tax taken out of the row above). Its name —
 * the row's, until the customer gives it its own — can be clicked to change it.
 */
function TaxRow({ t, joined, onRename }: { t: LedgerTransaction; joined: boolean; onRename: () => void }) {
  const agency = (
    <span className="w-fit max-w-full shrink-0 truncate rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-600/20">
      {t.offsetAccount}
      {t.taxRate !== undefined && ` · ${t.taxRate.toLocaleString(undefined, { maximumFractionDigits: 3 })}%`}
    </span>
  )
  return (
    <TableRow className={cn('bg-slate-50/80 text-slate-500 hover:bg-slate-100/70', joined && 'border-b-0')}>
      <TableCell className="py-1.5 pl-3 align-top text-xs sm:pl-5">
        <DateStack t={t} />
      </TableCell>
      <TableCell className="py-1.5 align-top text-xs whitespace-normal" title={t.name ?? undefined}>
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
      <TableCell className={cn(SHOW.desc, 'py-1.5 align-top')} title={`${t.offsetAccount} on: ${t.description}`}>
        <span className={cn('flex min-w-0 items-center gap-1.5', t.splitOfId ? 'pl-6' : 'pl-2')}>
          <CornerDownRight className="size-3.5 shrink-0 text-slate-400" />
          {agency}
          <span className="truncate text-xs">{t.description}</span>
        </span>
      </TableCell>
      <TableCell className="py-1.5 text-right align-top text-sm font-medium tabular-nums">{money(t.amount)}</TableCell>
      <TableCell className={cn(SHOW.stacked, 'py-1.5 align-top')}>
        <AccountStack t={t} tax />
      </TableCell>
      <TableCell className={cn(SHOW.wide, 'py-1.5 align-top')}>
        <AccountCell name={t.debitAccount} offset={t.debitAccount === t.offsetAccount} tax />
      </TableCell>
      <TableCell className={cn(SHOW.wide, 'py-1.5 align-top')}>
        <AccountCell name={t.creditAccount} offset={t.creditAccount === t.offsetAccount} tax />
      </TableCell>
      <TableCell className={cn(SHOW.wide, 'py-1.5 pr-5')} />
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
  onEdit,
  onSplit,
}: {
  t: LedgerTransaction
  joined: boolean
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
  return (
    <TableRow className={cn('group bg-brand/[0.03] hover:bg-brand/[0.06]', joined && 'border-b-0')}>
      <TableCell className="py-1.5 pl-3 align-top text-xs text-muted-foreground sm:pl-5">
        <DateStack t={t} />
      </TableCell>
      <TableCell
        className="py-1.5 align-top text-sm font-medium whitespace-normal text-[#0B1C2C]"
        title={t.name ?? undefined}
      >
        <span className="block truncate">
          <button
            type="button"
            onClick={onEdit}
            title="Change this split's name or category"
            className="max-w-full truncate rounded text-left hover:text-brand hover:underline"
          >
            {t.name ?? <span className="text-muted-foreground">Add name</span>}
          </button>
        </span>
        <span className="mt-1 flex flex-col gap-1 font-normal md:hidden">
          {item}
          <AccountStack t={t} onEdit={onEdit} />
          {edit}
        </span>
      </TableCell>
      <TableCell className={cn(SHOW.desc, 'py-1.5 align-top')} title={t.description}>
        <span className="flex min-w-0 items-center gap-1.5 pl-2">
          <CornerDownRight className="size-3.5 shrink-0 text-brand/60" />
          {item}
        </span>
        <span className="mt-1 flex pl-2 xl:hidden">{edit}</span>
      </TableCell>
      <TableCell
        className={cn(
          'py-1.5 text-right align-top text-sm font-semibold tabular-nums',
          t.amount < 0 ? 'text-red-600' : 'text-emerald-700',
        )}
      >
        {money(t.amount)}
      </TableCell>
      <TableCell className={cn(SHOW.stacked, 'py-1.5 align-top')}>
        <AccountStack t={t} onEdit={onEdit} />
      </TableCell>
      <TableCell className={cn(SHOW.wide, 'py-1.5 align-top')}>
        <AccountCell name={t.debitAccount} offset={t.debitAccount === t.offsetAccount} onEdit={onEdit} />
      </TableCell>
      <TableCell className={cn(SHOW.wide, 'py-1.5 align-top')}>
        <AccountCell name={t.creditAccount} offset={t.creditAccount === t.offsetAccount} onEdit={onEdit} />
      </TableCell>
      <TableCell className={cn(SHOW.wide, 'py-1.5 pr-5 align-top')}>{edit}</TableCell>
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
