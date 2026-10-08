import { useState, type ReactNode } from 'react'
import { BookOpen, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import type { ExportFormat, Period, Reports } from '@/api/bookkeeping'
import { PageHeader } from '@/components/Dashboard/PageHeader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useExportLedger } from '@/hooks/useExportLedger'
import { useReports } from '@/hooks/useReports'
import { useStatements } from '@/hooks/useStatements'
import { BalanceSheet } from './BalanceSheet'
import { ChartOfAccounts } from './ChartOfAccounts'
import { DebitCreditGuide } from './DebitCreditGuide'
import { IncomeStatement } from './IncomeStatement'
import { LedgerDialog } from './LedgerDialog'
import { ReportPeriod } from './ReportPeriod'
import { ReportSkeleton } from './ReportParts'
import { StatementsList } from './StatementsList'
import { UploadDropzone } from './UploadDropzone'

type Tab = 'overview' | 'accounts' | 'income' | 'balance'

/**
 * Bookkeeping: upload statements → the AI posts every transaction as a double entry →
 * view the ledger, the chart of accounts, income statement and balance sheet, and
 * download the whole ledger (all statements combined) as Excel or PDF.
 */
export function BookkeepingPage() {
  const statements = useStatements()
  const exporter = useExportLedger()
  const [tab, setTab] = useState<Tab>('overview')
  const [period, setPeriod] = useState<Period>({ from: null, to: null })
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [ledgerAccount, setLedgerAccount] = useState<string | null>(null)

  const list = statements.data ?? []
  const done = list.filter((s) => s.status === 'DONE')
  const rowCount = done.reduce((n, s) => n + s.transactionCount, 0)
  const busy = list.some((s) => s.status === 'PENDING' || s.status === 'PROCESSING')

  // The reports are fetched only once a report tab is opened.
  const periodValid = !period.from || !period.to || period.from <= period.to
  const reportsTab = tab !== 'overview'
  const reports = useReports(period, { enabled: reportsTab && periodValid && done.length > 0 })

  const openLedger = (account: string | null) => {
    setLedgerAccount(account)
    setLedgerOpen(true)
  }

  const exportButton = (format: ExportFormat, label: string, Icon: typeof FileText) => {
    const pending = exporter.isPending && exporter.variables === format
    return (
      <Button
        variant={format === 'xlsx' ? 'default' : 'outline'}
        disabled={!rowCount || exporter.isPending}
        onClick={() => exporter.mutate(format)}
        className={
          format === 'xlsx'
            ? 'h-10 gap-2 rounded-lg bg-brand px-4 text-white hover:bg-brand/85'
            : 'h-10 gap-2 rounded-lg px-4'
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
        {label}
      </Button>
    )
  }

  const report = (render: (r: Reports) => ReactNode) => {
    if (!done.length) {
      return (
        <div className="rounded-2xl bg-white px-6 py-16 text-center ring-1 ring-black/5">
          <p className="font-medium text-[#0B1C2C]">No figures yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a bank statement — the reports fill in once it has been read.
          </p>
        </div>
      )
    }
    if (reports.error) return <p className="text-sm text-destructive">{reports.error.message}</p>
    if (!reports.data) return <ReportSkeleton />
    return <div className={reports.isFetching ? 'opacity-60 transition-opacity' : undefined}>{render(reports.data)}</div>
  }

  return (
    <>
      <PageHeader
        title="Bookkeeping"
        description="Upload your bank statements — we post every transaction as a debit and a credit."
        actions={
          <>
            {exportButton('xlsx', 'Download Excel', FileSpreadsheet)}
            {exportButton('pdf', 'Download PDF', FileText)}
          </>
        }
      />
      {exporter.error && (
        <p role="alert" className="-mt-4 mb-6 text-sm text-destructive">
          {exporter.error.message}
        </p>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-6">
        <TabsList className="h-auto! w-full flex-wrap justify-start gap-1 rounded-xl bg-white p-1.5 ring-1 ring-black/5 sm:w-fit">
          <TabsTrigger value="overview" className="h-9 flex-none px-4">
            Overview
          </TabsTrigger>
          <TabsTrigger value="accounts" className="h-9 flex-none px-4">
            Chart of accounts
          </TabsTrigger>
          <TabsTrigger value="income" className="h-9 flex-none px-4">
            Income statement
          </TabsTrigger>
          <TabsTrigger value="balance" className="h-9 flex-none px-4">
            Balance sheet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="mb-8 grid gap-6 lg:grid-cols-5">
            <section className="lg:col-span-2">
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Upload</h2>
              <UploadDropzone />
              {busy && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Reading takes about a minute per statement — you can leave this page; it continues in the background.
                </p>
              )}
            </section>
            <section className="lg:col-span-3">
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Statements {list.length > 0 && <span className="text-foreground">· {list.length}</span>}
              </h2>
              <StatementsList statements={list} loading={statements.isLoading} />
              {statements.error && <p className="mt-2 text-sm text-destructive">{statements.error.message}</p>}
            </section>
          </div>

          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Ledger</h2>
            <div className="flex flex-col gap-4 rounded-2xl bg-white px-5 py-5 ring-1 ring-black/5 sm:flex-row sm:items-center">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                <BookOpen className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#0B1C2C]">
                  {rowCount.toLocaleString()} transaction{rowCount === 1 ? '' : 's'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {rowCount
                    ? `Every transaction from ${done.length} statement${done.length === 1 ? '' : 's'}, posted as a debit and a credit.`
                    : 'Upload a bank statement and every transaction will appear here.'}
                </p>
              </div>
              <Button
                disabled={!rowCount}
                onClick={() => openLedger(null)}
                className="h-10 rounded-lg bg-brand px-5 text-white hover:bg-brand/85"
              >
                View ledger
              </Button>
            </div>
          </section>

          <DebitCreditGuide />
        </TabsContent>

        {reportsTab && <ReportPeriod value={period} onChange={setPeriod} />}

        <TabsContent value="accounts">
          {report((r) => <ChartOfAccounts reports={r} onOpenAccount={openLedger} />)}
        </TabsContent>
        <TabsContent value="income">{report((r) => <IncomeStatement reports={r} />)}</TabsContent>
        <TabsContent value="balance">{report((r) => <BalanceSheet reports={r} />)}</TabsContent>
      </Tabs>

      <LedgerDialog
        open={ledgerOpen}
        onOpenChange={setLedgerOpen}
        statements={list}
        account={ledgerAccount}
        onAccountChange={setLedgerAccount}
      />
    </>
  )
}
