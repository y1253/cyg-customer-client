import type { Reports } from '@/api/bookkeeping'
import { periodLabel } from '@/lib/period'
import { ReportCard, ReportRow, ReportSection, UncategorizedNote } from './ReportParts'

/** Income − expenses = net income, for the period. */
export function IncomeStatement({ reports }: { reports: Reports }) {
  const is = reports.incomeStatement
  const profit = is.netIncome >= 0
  return (
    <ReportCard title="Income statement" subtitle={periodLabel(reports.from, reports.to)}>
      <UncategorizedNote reports={reports} />
      <ReportSection title="Income" lines={is.income} total={is.totalIncome} totalLabel="Total income" />
      <ReportSection title="Expenses" lines={is.expenses} total={is.totalExpenses} totalLabel="Total expenses" />
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
    </ReportCard>
  )
}
