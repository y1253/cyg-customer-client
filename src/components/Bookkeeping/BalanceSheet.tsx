import { Sparkles } from 'lucide-react'
import type { AccountType, Reports } from '@/api/bookkeeping'
import { openFloatingChat } from '@/components/Assistant/FloatingChat'
import { Button } from '@/components/ui/button'
import { useAssistantEnabled } from '@/hooks/useAssistant'
import { useMoveAccount } from '@/hooks/useMoveAccount'
import { money } from '@/lib/money'
import { fmtDay } from '@/lib/period'
import { useAccountMerge } from './AccountMerge'
import { ReportCard, ReportRow, ReportSection, UncategorizedNote } from './ReportParts'

/**
 * Assets = liabilities + equity, as of the end of the period (a balance sheet has no
 * start date). A bank account is its opening balance plus everything since; a credit card
 * is a liability — what is owed on it. Retained Earnings is the net income to date.
 * Click a row for its transactions; drag it to another section (or "Move to…") to move it.
 */
export function BalanceSheet({
  reports,
  onOpenAccount,
  unread = 0,
  onOpenStatements,
}: {
  reports: Reports
  onOpenAccount?: (account: string) => void
  /** Statements we could not read (failed / need review) — a likely cause when it is off. */
  unread?: number
  onOpenStatements?: () => void
}) {
  const bs = reports.balanceSheet
  const move = useMoveAccount()
  const merge = useAccountMerge()
  const section = {
    onMerge: merge.ask,
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
      {merge.error && <p className="mt-4 text-sm text-destructive">{merge.error.message}</p>}
      {merge.dialog}
      {!bs.balanced && <OffBy reports={reports} unread={unread} onOpenStatements={onOpenStatements} />}
    </ReportCard>
  )
}

/**
 * step8: the balance sheet is off — by how much, what that means, and what in THIS book
 * most likely caused it (each with a way to fix it), instead of one fixed sentence.
 */
function OffBy({
  reports,
  unread,
  onOpenStatements,
}: {
  reports: Reports
  unread: number
  onOpenStatements?: () => void
}) {
  const assistant = useAssistantEnabled()
  const bs = reports.balanceSheet
  const off = bs.totalAssets - bs.totalLiabilitiesAndEquity
  const lines = [...bs.assets, ...bs.liabilities, ...bs.equity]
  const broken = lines.filter((l) => (l.starts?.length ?? 0) > 1).map((l) => l.name)
  const causes: string[] = []
  if (unread)
    causes.push(
      `${unread} statement${unread === 1 ? '' : 's'} could not be read, so ${unread === 1 ? 'its' : 'their'} transactions are missing from the books.`,
    )
  if (broken.length)
    causes.push(
      `${broken.join(', ')} ${broken.length === 1 ? 'has' : 'have'} more than one starting date — a statement is missing in between, or one balance does not carry over to the next statement.`,
    )
  if (reports.uncategorized.count)
    causes.push(
      `${reports.uncategorized.count} transaction${reports.uncategorized.count === 1 ? ' is' : 's are'} not categorized yet.`,
    )
  return (
    <div className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800">
      <p className="font-semibold">
        Assets and liabilities + equity are off by {money(Math.abs(off))}
        {off > 0 ? ' (assets are higher)' : ' (liabilities + equity are higher)'}.
      </p>
      <p className="mt-1">
        Every transaction has two equal sides, so the two totals always match when the books are complete. A
        difference means part of an account's history is missing or a starting balance was read wrong.
      </p>
      {causes.length ? (
        <>
          <p className="mt-2 font-medium">Most likely in your books:</p>
          <ul className="mt-0.5 list-disc pl-5">
            {causes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2">We could not find the cause from here — ask the AI or let us know and we will check it.</p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {!!unread && onOpenStatements && (
          <Button size="sm" variant="outline" onClick={onOpenStatements}>
            See the statements
          </Button>
        )}
        {assistant && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              openFloatingChat(
                `My balance sheet is off by ${money(Math.abs(off))}${bs.asOf ? ` as of ${fmtDay(bs.asOf)}` : ''}. Can you find out why?`,
              )
            }
          >
            <Sparkles className="size-4" /> Ask AI
          </Button>
        )}
      </div>
    </div>
  )
}
