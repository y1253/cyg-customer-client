import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AccountType, Reports } from '@/api/bookkeeping'
import { openFloatingChat } from '@/components/Assistant/FloatingChat'
import { Button } from '@/components/ui/button'
import { useAssistantEnabled } from '@/hooks/useAssistant'
import { useRenameAccount } from '@/hooks/useMerge'
import { useMoveAccount } from '@/hooks/useMoveAccount'
import { money } from '@/lib/money'
import { fmtDay } from '@/lib/period'
import { useAccountMerge } from './AccountMerge'
import { ReportCard, ReportRow, ReportSection, UncategorizedNote } from './ReportParts'
import { StartsChatDialog } from './StartsChatDialog'

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
  const { t } = useTranslation(['books', 'common'])
  const bs = reports.balanceSheet
  const move = useMoveAccount()
  const merge = useAccountMerge()
  const rename = useRenameAccount()
  const assistant = useAssistantEnabled()
  // step2: the account whose starting dates the AI chat is about.
  const [startsChat, setStartsChat] = useState<{ account: string; note: string } | null>(null)
  const section = {
    onAskStarts: assistant ? (account: string, note: string) => setStartsChat({ account, note }) : undefined,
    onMerge: merge.ask,
    onRename: (from: string, to: string) => rename.mutateAsync({ from, to }),
    onOpen: onOpenAccount && ((l: { name: string }) => onOpenAccount(l.name)),
    onMove: (account: string, type: AccountType | null) => move.mutate({ account, type }),
    moved: new Set(reports.moved ?? []),
  }
  return (
    <ReportCard
      title={t('tabs.balance')}
      subtitle={bs.asOf ? t('reports.asOf', { date: fmtDay(bs.asOf) }) : t('reports.asOfLatest')}
    >
      <UncategorizedNote reports={reports} />
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <ReportSection
            title={t('reports.section.ASSET')}
            type="ASSET"
            lines={bs.assets}
            total={bs.totalAssets}
            totalLabel={t('reports.total.ASSET')}
            empty={t('common:status.none')}
            {...section}
          />
        </div>
        <div>
          <ReportSection
            title={t('reports.section.LIABILITY')}
            type="LIABILITY"
            lines={bs.liabilities}
            total={bs.totalLiabilities}
            totalLabel={t('reports.total.LIABILITY')}
            empty={t('common:status.none')}
            {...section}
          />
          <ReportSection
            title={t('reports.section.EQUITY')}
            type="EQUITY"
            lines={bs.equity}
            total={bs.totalEquity}
            totalLabel={t('reports.total.EQUITY')}
            empty={t('common:status.none')}
            {...section}
          />
          <ReportRow
            label={t('reports.totalLiabEquity')}
            amount={bs.totalLiabilitiesAndEquity}
            strong
            className="mt-2 rounded-lg border-0 bg-muted/50 px-3 py-2.5"
          />
        </div>
      </div>
      {move.error && <p className="mt-4 text-sm text-destructive">{move.error.message}</p>}
      {merge.error && <p className="mt-4 text-sm text-destructive">{merge.error.message}</p>}
      {merge.dialog}
      <StartsChatDialog target={startsChat} onClose={() => setStartsChat(null)} />
      {!bs.balanced &&<OffBy reports={reports} unread={unread} onOpenStatements={onOpenStatements} />}
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
  const { t } = useTranslation(['books', 'common'])
  const assistant = useAssistantEnabled()
  const bs = reports.balanceSheet
  const off = bs.totalAssets - bs.totalLiabilitiesAndEquity
  const lines = [...bs.assets, ...bs.liabilities, ...bs.equity]
  const broken = lines.filter((l) => (l.starts?.length ?? 0) > 1).map((l) => l.name)
  const causes: string[] = []
  if (unread) causes.push(t('offBy.unread', { count: unread }))
  if (broken.length) causes.push(t('offBy.broken', { count: broken.length, names: broken.join(', ') }))
  if (reports.uncategorized.count) causes.push(t('offBy.uncategorized', { count: reports.uncategorized.count }))
  return (
    <div className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800">
      <p className="font-semibold">
        {t(off > 0 ? 'offBy.titleAssets' : 'offBy.titleLiabilities', { amount: money(Math.abs(off)) })}
      </p>
      <p className="mt-1">
        {t('offBy.why')}
      </p>
      {causes.length ? (
        <>
          <p className="mt-2 font-medium">{t('offBy.likely')}</p>
          <ul className="mt-0.5 list-disc pl-5">
            {causes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2">{t('offBy.noCause')}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {!!unread && onOpenStatements && (
          <Button size="sm" variant="outline" onClick={onOpenStatements}>
            {t('offBy.seeStatements')}
          </Button>
        )}
        {assistant && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              openFloatingChat(
                bs.asOf
                  ? t('offBy.askAsOf', { amount: money(Math.abs(off)), date: fmtDay(bs.asOf) })
                  : t('offBy.ask', { amount: money(Math.abs(off)) }),
              )
            }
          >
            <Sparkles className="size-4" /> {t('offBy.askAi')}
          </Button>
        )}
      </div>
    </div>
  )
}
