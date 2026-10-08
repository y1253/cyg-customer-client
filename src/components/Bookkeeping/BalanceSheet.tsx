import type { Reports } from '@/api/bookkeeping'
import { fmtDay } from '@/lib/period'
import { ReportCard, ReportRow, ReportSection, UncategorizedNote } from './ReportParts'

/**
 * Assets = liabilities + equity, as of the end of the period (a balance sheet has no
 * start date). Cash is each bank account's opening balance plus everything since;
 * Retained Earnings is the net income to date.
 */
export function BalanceSheet({ reports }: { reports: Reports }) {
  const bs = reports.balanceSheet
  return (
    <ReportCard title="Balance sheet" subtitle={bs.asOf ? `As of ${fmtDay(bs.asOf)}` : 'As of the latest statement'}>
      <UncategorizedNote reports={reports} />
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <ReportSection title="Assets" lines={bs.assets} total={bs.totalAssets} totalLabel="Total assets" empty="None" />
        </div>
        <div>
          <ReportSection
            title="Liabilities"
            lines={bs.liabilities}
            total={bs.totalLiabilities}
            totalLabel="Total liabilities"
            empty="None"
          />
          <ReportSection title="Equity" lines={bs.equity} total={bs.totalEquity} totalLabel="Total equity" empty="None" />
          <ReportRow
            label="Total liabilities & equity"
            amount={bs.totalLiabilitiesAndEquity}
            strong
            className="mt-2 rounded-lg border-0 bg-muted/50 px-3 py-2.5"
          />
        </div>
      </div>
      {!bs.balanced && (
        <p className="mt-4 text-sm text-destructive">
          Assets and liabilities + equity differ — please let us know so we can check the statements.
        </p>
      )}
    </ReportCard>
  )
}
