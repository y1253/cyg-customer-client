import type { AccountBalance, AccountType, Reports } from '@/api/bookkeeping'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useRenameAccount } from '@/hooks/useMerge'
import { useMoveAccount } from '@/hooks/useMoveAccount'
import { canRenameAccount } from '@/lib/account-names'
import { money } from '@/lib/money'
import { cn } from '@/lib/utils'
import { fmtDay, periodLabel } from '@/lib/period'
import { startingNote } from '@/lib/starting-dates'
import { AccountCurrency, ForeignAmount } from './AccountCurrency'
import { MoveMenu } from './AccountMove'
import { dragProps, SECTION_LABEL, useAccountDrop, useDropTarget } from './account-move'
import { useAccountMerge } from './AccountMerge'
import { InlineRename } from './InlineRename'
import { ReportCard, UncategorizedNote } from './ReportParts'

const GROUPS: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']

/**
 * Every account with what was posted to it in the period — e.g. the total paid for
 * office supplies. Clicking an account with activity opens its ledger. An account can be
 * dragged to another section (or "Move to…"), e.g. from Assets to Liabilities; the
 * reports follow at once.
 */
export function ChartOfAccounts({ reports, onOpenAccount }: { reports: Reports; onOpenAccount: (name: string) => void }) {
  const move = useMoveAccount()
  const moved = new Set(reports.moved ?? [])
  const onMove = (account: string, type: AccountType | null) => move.mutate({ account, type })
  const merge = useAccountMerge()
  const rename = useRenameAccount()
  const onRename = (from: string, to: string) => rename.mutateAsync({ from, to })
  return (
    <ReportCard title="Chart of accounts" subtitle={periodLabel(reports.from, reports.to)}>
      <UncategorizedNote reports={reports} />
      <div className="-mx-5 -mb-4">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Account</TableHead>
              <TableHead className="w-32 text-right">Transactions</TableHead>
              <TableHead className="hidden w-44 text-right sm:table-cell">Starting balance</TableHead>
              <TableHead className="w-40 pr-5 text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          {GROUPS.map((type) => (
            <Group
              key={type}
              type={type}
              accounts={reports.accounts.filter((a) => a.type === type)}
              moved={moved}
              onOpen={onOpenAccount}
              onMove={onMove}
              onMerge={merge.ask}
              onRename={onRename}
            />
          ))}
        </Table>
      </div>
      {move.error && <p className="mt-4 text-sm text-destructive">{move.error.message}</p>}
      {merge.error && <p className="mt-4 text-sm text-destructive">{merge.error.message}</p>}
      {merge.dialog}
      <p className="mt-6 text-xs text-muted-foreground">
        Bank accounts show the net money in and out for the period; a credit card what was charged on it. Starting
        balance = the balance a bank or card account's books start at (a card: the amount owed) — red when they start
        more than once (a missing statement, or balances that don't carry over). Click an
        account to see its transactions, drag it to another section to move it, or drop it on another account to merge
        the two (a bank or card account only with another one that has a Bank feeds folder). Click a bank account's currency
        to change it; a foreign account shows its balance before conversion underneath.
      </p>
    </ReportCard>
  )
}

/** One section: its header row and accounts — and the place an account is dropped. */
function Group({
  type,
  accounts,
  moved,
  onOpen,
  onMove,
  onMerge,
  onRename,
}: {
  type: AccountType
  accounts: AccountBalance[]
  moved: ReadonlySet<string>
  onOpen: (name: string) => void
  onMove: (account: string, type: AccountType | null) => void
  onMerge: (from: string, into: string, bank: boolean) => void
  onRename: (from: string, to: string) => Promise<unknown>
}) {
  const drop = useDropTarget(type, onMove)
  const total = accounts.reduce((c, a) => c + Math.round(a.balance * 100), 0) / 100
  return (
    <TableBody {...drop.props} className={cn(drop.over && 'bg-brand/5 outline-2 outline-brand/30')}>
      <TableRow className="bg-muted/20 hover:bg-muted/20">
        <TableCell className="pl-5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {SECTION_LABEL[type]}
        </TableCell>
        <TableCell />
        <TableCell className="hidden sm:table-cell" />
        <TableCell className="pr-5 text-right text-xs font-semibold text-muted-foreground tabular-nums">
          {accounts.length ? money(total) : ''}
        </TableCell>
      </TableRow>
      {!accounts.length && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={4} className="pl-8 text-xs text-muted-foreground">
            Drop an account here to move it to {SECTION_LABEL[type].toLowerCase()}
          </TableCell>
        </TableRow>
      )}
      {accounts.map((a) => (
        <AccountRow
          key={`${type}:${a.name}`}
          account={a}
          moved={moved.has(a.name)}
          onOpen={onOpen}
          onMove={onMove}
          onMerge={(from) => onMerge(from, a.name, a.bank)}
          onRename={canRenameAccount(a) ? (to) => onRename(a.name, to) : undefined}
        />
      ))}
    </TableBody>
  )
}

function AccountRow({
  account: a,
  moved,
  onOpen,
  onMove,
  onMerge,
  onRename,
}: {
  account: AccountBalance
  moved: boolean
  onOpen: (name: string) => void
  onMove: (account: string, type: AccountType | null) => void
  /** step8: another account was dropped on this row — merge it into this one. */
  onMerge: (from: string) => void
  /** step2: rename it in place (the pencil beside its name). */
  onRename?: (to: string) => Promise<unknown>
}) {
  const active = a.count > 0
  const drop = useAccountDrop(a.name, a.bank, onMerge)
  return (
    <TableRow
      {...dragProps(a.name, a.bank)}
      {...drop.props}
      onClick={active ? () => onOpen(a.name) : undefined}
      className={cn(
        'group cursor-grab active:cursor-grabbing',
        !active && 'text-muted-foreground hover:bg-transparent',
        drop.over && 'bg-brand/10 outline-2 outline-brand/40',
      )}
    >
      <TableCell className="pl-8">
        <span className="flex items-center gap-2">
          {onRename ? (
            <InlineRename value={a.name} onSave={onRename} label={`Rename ${a.name}`}>
              <span className={cn(active && 'font-medium text-[#0B1C2C]')}>{a.name}</span>
            </InlineRename>
          ) : (
            <span className={cn(active && 'font-medium text-[#0B1C2C]')}>{a.name}</span>
          )}
          {a.bank && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {a.type === 'LIABILITY' ? 'Card' : 'Bank'}
            </span>
          )}
          {a.bank && <AccountCurrency account={a.name} currency={a.currency} />}
          {moved && <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[11px] font-medium text-brand">Moved</span>}
          <MoveMenu account={a.name} current={a.type} bank={a.bank} moved={moved} onMove={onMove} />
        </span>
      </TableCell>
      <TableCell className="text-right tabular-nums">{a.count || '—'}</TableCell>
      <TableCell className="hidden text-right tabular-nums sm:table-cell">
        <StartingBalance account={a} />
      </TableCell>
      <TableCell className={cn('pr-5 text-right tabular-nums', active && 'font-semibold', a.balance < 0 && 'text-red-600')}>
        {active ? money(a.balance) : '—'}
        {active && <ForeignAmount currency={a.currency} amount={a.foreignBalance} />}
      </TableCell>
    </TableRow>
  )
}

/**
 * step2 (2026-11-12, user's request): where a bank / card account's books start — the latest
 * starting balance up to the period's end, in the account's own currency (a card: the
 * amount owed). Two or more = a break in the chain: red, every start in the tooltip.
 */
function StartingBalance({ account: a }: { account: AccountBalance }) {
  const starts = a.starts ?? []
  if (!a.bank || !starts.length) return <span className="text-muted-foreground">—</span>
  const last = starts[starts.length - 1]
  const broken = starts.length > 1
  const note = startingNote(starts)
  const tip = [note?.text, ...(note?.reasons ?? [])].filter(Boolean).join('\n')
  return (
    <span className={cn('inline-flex flex-col items-end', broken && 'text-red-700')} title={tip}>
      <span className="inline-flex items-center gap-1">
        {broken && <span className="size-1.5 rounded-full bg-red-600" aria-label="starts more than once" />}
        {last.amount === undefined ? '—' : money(last.amount)}
        {a.foreignBalance !== undefined && a.currency ? <span className="text-xs">{a.currency}</span> : null}
      </span>
      {last.date && <span className="text-[11px] text-muted-foreground">on {fmtDay(last.date)}</span>}
    </span>
  )
}
