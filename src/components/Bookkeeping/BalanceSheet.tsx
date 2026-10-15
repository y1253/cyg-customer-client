import type { AccountType, Reports } from '@/api/bookkeeping'
import { useMoveAccount } from '@/hooks/useMoveAccount'
import { fmtDay } from '@/lib/period'
import { ReportCard, ReportRow, ReportSection, UncategorizedNote } from './ReportParts'

/**
 * Assets = liabilities + equity, as of the end of the period (a balance sheet has no
 * start date). A bank account is its opening balance plus everything since; a credit card
 * is a liability — what is owed on it. Retained Earnings is the net income to date.
 * Click a row for its transactions; drag it to another section (or "Move to…") to move it.
 */
export function BalanceSheet({ reports, onOpenAccount }: { reports: Reports; onOpenAccount?: (account: string) => void }) {
  const bs = reports.balanceSheet
  const move = useMoveAccount()
  const section = {
    onOpen: onOpenAccount && ((l: { name: string }) => onOpenAccount(l.name)),
    onMove: (account: string, type: AccountType | null) => move.mutate({ account, type }),
    moved: new Set(reports.moved ?? []),
  }
  return (
    <ReportCard title="Balance sheet" subtitle={bs.asOf ? `As of ${fmtDay(bs.asOf)}` : 'As of the latest statement'}>
      <UncategorizedNote reports={reports} />
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <ReportSection
            title="Assets"
            type="ASSET"
            lines={bs.assets}
            total={bs.totalAssets}
            totalLabel="Total assets"
            empty="None"
            {...section}
          />
        </div>
        <div>
          <ReportSection
            title="Liabilities"
            type="LIABILITY"
            lines={bs.liabilities}
            total={bs.totalLiabilities}
            totalLabel="Total liabilities"
            empty="None"
            {...section}
          />
          <ReportSection
            title="Equity"
            type="EQUITY"
            lines={bs.equity}
            total={bs.totalEquity}
            totalLabel="Total equity"
            empty="None"
            {...section}
          />
          <ReportRow
            label="Total liabilities & equity"
            amount={bs.totalLiabilitiesAndEquity}
            strong
            className="mt-2 rounded-lg border-0 bg-muted/50 px-3 py-2.5"
          />
        </div>
      </div>
      {move.error && <p className="mt-4 text-sm text-destructive">{move.error.message}</p>}
      {!bs.balanced && (
        <p className="mt-4 text-sm text-destructive">
          Assets and liabilities + equity differ — please let us know so we can check the statements.
        </p>
      )}
    </ReportCard>
  )
}
