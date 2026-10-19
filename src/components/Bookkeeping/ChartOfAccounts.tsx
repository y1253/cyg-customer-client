import type { AccountBalance, AccountType, Reports } from '@/api/bookkeeping'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useMoveAccount } from '@/hooks/useMoveAccount'
import { money } from '@/lib/money'
import { cn } from '@/lib/utils'
import { periodLabel } from '@/lib/period'
import { AccountCurrency, ForeignAmount } from './AccountCurrency'
import { MoveMenu } from './AccountMove'
import { dragProps, SECTION_LABEL, useDropTarget } from './account-move'
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
  return (
    <ReportCard title="Chart of accounts" subtitle={periodLabel(reports.from, reports.to)}>
      <UncategorizedNote reports={reports} />
      <div className="-mx-5 -mb-4">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Account</TableHead>
              <TableHead className="w-32 text-right">Transactions</TableHead>
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
            />
          ))}
        </Table>
      </div>
      {move.error && <p className="mt-4 text-sm text-destructive">{move.error.message}</p>}
      <p className="mt-6 text-xs text-muted-foreground">
        Bank accounts show the net money in and out for the period; a credit card what was charged on it. Click an
        account to see its transactions, or drag it to another section to move it. Click a bank account's currency
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
}: {
  type: AccountType
  accounts: AccountBalance[]
  moved: ReadonlySet<string>
  onOpen: (name: string) => void
  onMove: (account: string, type: AccountType | null) => void
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
        <TableCell className="pr-5 text-right text-xs font-semibold text-muted-foreground tabular-nums">
          {accounts.length ? money(total) : ''}
        </TableCell>
      </TableRow>
      {!accounts.length && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={3} className="pl-8 text-xs text-muted-foreground">
            Drop an account here to move it to {SECTION_LABEL[type].toLowerCase()}
          </TableCell>
        </TableRow>
      )}
      {accounts.map((a) => (
        <AccountRow key={`${type}:${a.name}`} account={a} moved={moved.has(a.name)} onOpen={onOpen} onMove={onMove} />
      ))}
    </TableBody>
  )
}

function AccountRow({
  account: a,
  moved,
  onOpen,
  onMove,
}: {
  account: AccountBalance
  moved: boolean
  onOpen: (name: string) => void
  onMove: (account: string, type: AccountType | null) => void
}) {
  const active = a.count > 0
  return (
    <TableRow
      {...dragProps(a.name, a.bank)}
      onClick={active ? () => onOpen(a.name) : undefined}
      className={cn('group cursor-grab active:cursor-grabbing', !active && 'text-muted-foreground hover:bg-transparent')}
    >
      <TableCell className="pl-8">
        <span className="flex items-center gap-2">
          <span className={cn(active && 'font-medium text-[#0B1C2C]')}>{a.name}</span>
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
      <TableCell className={cn('pr-5 text-right tabular-nums', active && 'font-semibold', a.balance < 0 && 'text-red-600')}>
        {active ? money(a.balance) : '—'}
        {active && <ForeignAmount currency={a.currency} amount={a.foreignBalance} />}
      </TableCell>
    </TableRow>
  )
}
