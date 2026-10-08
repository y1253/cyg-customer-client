import type { AccountBalance, AccountType, Reports } from '@/api/bookkeeping'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { money } from '@/lib/money'
import { cn } from '@/lib/utils'
import { periodLabel } from '@/lib/period'
import { ReportCard, UncategorizedNote } from './ReportParts'

const GROUPS: Array<{ type: AccountType; label: string }> = [
  { type: 'ASSET', label: 'Assets' },
  { type: 'LIABILITY', label: 'Liabilities' },
  { type: 'EQUITY', label: 'Equity' },
  { type: 'INCOME', label: 'Income' },
  { type: 'EXPENSE', label: 'Expenses' },
]

/**
 * Every account with what was posted to it in the period — e.g. the total paid for
 * office supplies. Clicking an account with activity opens its ledger.
 */
export function ChartOfAccounts({ reports, onOpenAccount }: { reports: Reports; onOpenAccount: (name: string) => void }) {
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
          <TableBody>
            {GROUPS.map((g) => {
              const accounts = reports.accounts.filter((a) => a.type === g.type)
              if (!accounts.length) return null
              const total = accounts.reduce((c, a) => c + Math.round(a.balance * 100), 0) / 100
              return [
                <TableRow key={g.type} className="bg-muted/20 hover:bg-muted/20">
                  <TableCell className="pl-5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {g.label}
                  </TableCell>
                  <TableCell />
                  <TableCell className="pr-5 text-right text-xs font-semibold text-muted-foreground tabular-nums">
                    {money(total)}
                  </TableCell>
                </TableRow>,
                ...accounts.map((a) => <AccountRow key={`${g.type}:${a.name}`} account={a} onOpen={onOpenAccount} />),
              ]
            })}
          </TableBody>
        </Table>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Bank accounts show the net money in and out for the period. Click an account to see its transactions.
      </p>
    </ReportCard>
  )
}

function AccountRow({ account: a, onOpen }: { account: AccountBalance; onOpen: (name: string) => void }) {
  const active = a.count > 0
  return (
    <TableRow
      onClick={active ? () => onOpen(a.name) : undefined}
      className={cn(active ? 'cursor-pointer' : 'text-muted-foreground hover:bg-transparent')}
    >
      <TableCell className="pl-8">
        <span className={cn(active && 'font-medium text-[#0B1C2C]')}>{a.name}</span>
        {a.bank && (
          <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            Bank
          </span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">{a.count || '—'}</TableCell>
      <TableCell className={cn('pr-5 text-right tabular-nums', active && 'font-semibold', a.balance < 0 && 'text-red-600')}>
        {active ? money(a.balance) : '—'}
      </TableCell>
    </TableRow>
  )
}
