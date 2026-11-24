import { useTranslation } from 'react-i18next'
import type { AccountType, Reports } from '@/api/bookkeeping'
import { useRenameAccount } from '@/hooks/useMerge'
import { useMoveAccount } from '@/hooks/useMoveAccount'
import { periodLabel } from '@/lib/period'
import { useAccountMerge } from './AccountMerge'
import { BY_NAME, type LedgerScope } from './ledger-scope'
import { ReportCard, ReportRow, ReportSection, UncategorizedNote } from './ReportParts'

/**
 * Income − expenses = net income, for the period. Hover a line for its total per name;
 * click it for its transactions, sorted by name (the column headers can change that).
 * A line can be dragged to the other section (or "Move to…"), or onto another line to merge
 * the two (step8).
 */
export function IncomeStatement({ reports, onOpen }: { reports: Reports; onOpen?: (scope: LedgerScope) => void }) {
  const { t } = useTranslation(['books', 'common'])
  const is = reports.incomeStatement
  const profit = is.netIncome >= 0
  const move = useMoveAccount()
  const rename = useRenameAccount()
  // step8 (2026-11-11): drop a line on another line to merge them, as on the balance sheet.
  const merge = useAccountMerge()
  const section = {
    onRename: (from: string, to: string) => rename.mutateAsync({ from, to }),
    onOpen: onOpen && ((l: { name: string }) => onOpen({ account: l.name, sort: BY_NAME })),
    onMove: (account: string, type: AccountType | null) => move.mutate({ account, type }),
    moved: new Set(reports.moved ?? []),
    onMerge: merge.ask,
  }
  return (
    <ReportCard title={t('tabs.income')} subtitle={periodLabel(reports.from, reports.to)}>
      <UncategorizedNote reports={reports} />
      <ReportSection
        title={t('reports.section.INCOME')}
        type="INCOME"
        lines={is.income}
        total={is.totalIncome}
        totalLabel={t('reports.total.INCOME')}
        {...section}
      />
      <ReportSection
        title={t('reports.section.EXPENSE')}
        type="EXPENSE"
        lines={is.expenses}
        total={is.totalExpenses}
        totalLabel={t('reports.total.EXPENSE')}
        {...section}
      />
      <ReportRow
        label={profit ? t('reports.netIncome') : t('reports.netLoss')}
        amount={is.netIncome}
        strong
        className={
          profit
            ? 'mt-2 rounded-lg border-0 bg-emerald-50 px-3 py-2.5 text-base text-emerald-800'
            : 'mt-2 rounded-lg border-0 bg-red-50 px-3 py-2.5 text-base text-red-700'
        }
      />
      {move.error && <p className="mt-4 text-sm text-destructive">{move.error.message}</p>}
      {merge.error && <p className="mt-4 text-sm text-destructive">{merge.error.message}</p>}
      {merge.dialog}
    </ReportCard>
  )
}
