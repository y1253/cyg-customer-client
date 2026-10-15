import type { AccountType, Reports } from '@/api/bookkeeping'
import { useMoveAccount } from '@/hooks/useMoveAccount'
import { periodLabel } from '@/lib/period'
import { BY_NAME, type LedgerScope } from './ledger-scope'
import { ReportCard, ReportRow, ReportSection, UncategorizedNote } from './ReportParts'

/**
 * Income − expenses = net income, for the period. Hover a line for its total per name;
 * click it for its transactions, sorted by name (the column headers can change that).
 * A line can be dragged to the other section (or "Move to…").
 */
export function IncomeStatement({ reports, onOpen }: { reports: Reports; onOpen?: (scope: LedgerScope) => void }) {
  const is = reports.incomeStatement
  const profit = is.netIncome >= 0
  const move = useMoveAccount()
  const section = {
    onOpen: onOpen && ((l: { name: string }) => onOpen({ account: l.name, sort: BY_NAME })),
    onMove: (account: string, type: AccountType | null) => move.mutate({ account, type }),
    moved: new Set(reports.moved ?? []),
  }
  return (
    <ReportCard title="Income statement" subtitle={periodLabel(reports.from, reports.to)}>
      <UncategorizedNote reports={reports} />
      <ReportSection title="Income" type="INCOME" lines={is.income} total={is.totalIncome} totalLabel="Total income" {...section} />
      <ReportSection
        title="Expenses"
        type="EXPENSE"
        lines={is.expenses}
        total={is.totalExpenses}
        totalLabel="Total expenses"
        {...section}
      />
      <ReportRow
        label={profit ? 'Net income' : 'Net loss'}
        amount={is.netIncome}
        strong
        className={
          profit
            ? 'mt-2 rounded-lg border-0 bg-emerald-50 px-3 py-2.5 text-base text-emerald-800'
            : 'mt-2 rounded-lg border-0 bg-red-50 px-3 py-2.5 text-base text-red-700'
        }
      />
      {move.error && <p className="mt-4 text-sm text-destructive">{move.error.message}</p>}
    </ReportCard>
  )
}
