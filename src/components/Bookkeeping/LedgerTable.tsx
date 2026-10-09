import { useMemo, useState } from 'react'
import { CornerDownRight, Search } from 'lucide-react'
import type { LedgerTransaction, Statement } from '@/api/bookkeeping'
import { Badge } from '@/components/ui/badge'
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

/**
 * The ledger, read-only, in the firm's own columns: pending date, posting date, name,
 * description, amount, debit, credit. The bank account sits on one side of every row and
 * the AI-chosen account on the other (the offset), shown as a chip.
 * `account` limits it to the rows posted to one account (from the chart of accounts).
 * A statement's printed starting balance comes as its own shaded row (`kind: 'opening'`).
 * A tax line (`kind: 'tax'`) sits directly under the transaction it taxes: indented,
 * lighter, joined to it without a divider. The transaction shows net of its tax, so the
 * two add up to the bank amount and both count in the net change.
 */
export function LedgerTable({
  transactions,
  statements,
  loading,
  account,
  onClearAccount,
}: {
  transactions: LedgerTransaction[]
  statements: Statement[]
  loading: boolean
  account?: string | null
  onClearAccount?: () => void
}) {
  const [query, setQuery] = useState('')
  const [statementId, setStatementId] = useState<number | 'all'>('all')
  const [shown, setShown] = useState(PAGE)

  const done = statements.filter((s) => s.status === 'DONE')
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return transactions.filter(
      (t) =>
        (statementId === 'all' || t.statementId === statementId) &&
        (!account || t.debitAccount === account || t.creditAccount === account) &&
        (!q ||
          t.description.toLowerCase().includes(q) ||
          t.name?.toLowerCase().includes(q) ||
          t.debitAccount.toLowerCase().includes(q) ||
          t.creditAccount.toLowerCase().includes(q)),
    )
  }, [transactions, query, statementId, account])
  const net =
    rows.reduce((cents, t) => cents + Math.round(t.amount * 100), 0) / 100
  const taxCount = rows.filter((t) => t.kind === 'tax').length
  const txCount = rows.length - taxCount
  const allTx = useMemo(() => transactions.filter((t) => t.kind !== 'tax').length, [transactions])

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center">
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
        {done.length > 1 && (
          <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
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
                    'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
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
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-28 pl-5">Pending date</TableHead>
              <TableHead className="w-28">Posting date</TableHead>
              <TableHead className="w-40">Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-32 text-right">Amount</TableHead>
              <TableHead className="w-44">Debit</TableHead>
              <TableHead className="w-44">Credit</TableHead>
              <TableHead className="w-44 pr-5">Statement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, shown).map((t, i, page) =>
              t.kind === 'tax' ? (
                <TaxRow key={t.key} t={t} />
              ) : (
                <TableRow
                  key={t.key}
                  className={cn(
                    t.kind === 'opening' && 'bg-muted/40',
                    // Joined to its tax lines: no divider between them.
                    page[i + 1]?.kind === 'tax' && 'border-b-0',
                  )}
                >
                  <TableCell className="pl-5 text-muted-foreground">{fmtDate(t.pendingDate)}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(t.postingDate)}</TableCell>
                  <TableCell className="max-w-[10rem] truncate font-medium text-[#0B1C2C]" title={t.name ?? undefined}>
                    {t.name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="max-w-[18rem] truncate text-[#0B1C2C]" title={t.description}>
                    {t.kind === 'opening' ? <Badge variant="secondary">{t.description}</Badge> : t.description}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-semibold tabular-nums',
                      t.amount < 0 ? 'text-red-600' : 'text-emerald-700',
                    )}
                  >
                    {money(t.amount)}
                  </TableCell>
                  <TableCell>
                    <AccountCell name={t.debitAccount} offset={t.debitAccount === t.offsetAccount} />
                  </TableCell>
                  <TableCell>
                    <AccountCell name={t.creditAccount} offset={t.creditAccount === t.offsetAccount} />
                  </TableCell>
                  <TableCell className="pr-5">
                    <span
                      className="inline-flex max-w-full truncate rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      title={t.statementLabel}
                    >
                      {t.statementLabel}
                    </span>
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
          <TableFooter className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="pl-5 font-medium">
                {txCount.toLocaleString()} transaction{txCount === 1 ? '' : 's'}
                {txCount !== allTx && ` of ${allTx.toLocaleString()}`}
                {taxCount > 0 && (
                  <span className="font-normal text-muted-foreground">
                    {' '}
                    + {taxCount.toLocaleString()} tax line{taxCount === 1 ? '' : 's'}
                  </span>
                )}
              </TableCell>
              <TableCell
                className={cn('text-right font-bold tabular-nums', net < 0 ? 'text-red-600' : 'text-emerald-700')}
              >
                {money(net)}
              </TableCell>
              <TableCell colSpan={3} className="pr-5 text-sm text-muted-foreground">
                net change
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )}

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
 * A tax line, under the transaction it taxes: same dates and payee, lighter, indented
 * with a hook arrow and the agency + rate, the amount in neutral grey (its share of the bank amount above).
 */
function TaxRow({ t }: { t: LedgerTransaction }) {
  return (
    <TableRow className="bg-slate-50/80 text-slate-500 hover:bg-slate-100/70">
      <TableCell className="py-1.5 pl-5 text-xs">{fmtDate(t.pendingDate)}</TableCell>
      <TableCell className="py-1.5 text-xs">{fmtDate(t.postingDate)}</TableCell>
      <TableCell className="max-w-[10rem] truncate py-1.5 text-xs" title={t.name ?? undefined}>
        {t.name}
      </TableCell>
      <TableCell className="max-w-[18rem] py-1.5" title={`${t.offsetAccount} on: ${t.description}`}>
        <span className="flex min-w-0 items-center gap-1.5 pl-2">
          <CornerDownRight className="size-3.5 shrink-0 text-slate-400" />
          <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-600/20">
            {t.offsetAccount}
            {t.taxRate !== undefined && ` · ${t.taxRate.toLocaleString(undefined, { maximumFractionDigits: 3 })}%`}
          </span>
          <span className="truncate text-xs">{t.description}</span>
        </span>
      </TableCell>
      <TableCell className="py-1.5 text-right text-sm font-medium tabular-nums">{money(t.amount)}</TableCell>
      <TableCell className="py-1.5">
        <AccountCell name={t.debitAccount} offset={t.debitAccount === t.offsetAccount} tax />
      </TableCell>
      <TableCell className="py-1.5">
        <AccountCell name={t.creditAccount} offset={t.creditAccount === t.offsetAccount} tax />
      </TableCell>
      <TableCell className="py-1.5 pr-5" />
    </TableRow>
  )
}

/** The AI-chosen (offset) account gets a soft chip; the bank account is plain text. */
function AccountCell({ name, offset, tax }: { name: string; offset: boolean; tax?: boolean }) {
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
  return offset ? (
    <span className="inline-flex max-w-full truncate rounded-md bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
      {name}
    </span>
  ) : (
    <span className="truncate text-sm text-[#0B1C2C]">{name}</span>
  )
}
