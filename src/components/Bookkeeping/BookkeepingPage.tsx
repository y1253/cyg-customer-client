import { useState, type ReactNode } from 'react'
import { FileSpreadsheet, FileText, Loader2, Sparkles } from 'lucide-react'
import { unreadable, type ExportFormat, type Period, type Reports } from '@/api/bookkeeping'
import { AssistantPanel } from '@/components/Assistant/AssistantPanel'
import { PageHeader } from '@/components/Dashboard/PageHeader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAssistantEnabled } from '@/hooks/useAssistant'
import { useExportLedger } from '@/hooks/useExportLedger'
import { useReports } from '@/hooks/useReports'
import { useStatements } from '@/hooks/useStatements'
import { useTransactions } from '@/hooks/useTransactions'
import type { SortState } from '@/lib/table-sort'
import { AttachmentsPanel } from './AttachmentsPanel'
import { BalanceSheet } from './BalanceSheet'
import { ChartOfAccounts } from './ChartOfAccounts'
import { DebitCreditGuide } from './DebitCreditGuide'
import { GenerateBar } from './GenerateBar'
import { IncomeStatement } from './IncomeStatement'
import { LedgerDialog } from './LedgerDialog'
import type { LedgerScope } from './ledger-scope'
import { LedgerTable } from './LedgerTable'
import { ReportPeriod } from './ReportPeriod'
import { ReportSkeleton } from './ReportParts'
import { StatementsList } from './StatementsList'
import { Names } from './Names'
import { Products } from './Products'
import { UploadDropzone } from './UploadDropzone'

type Tab =
  | 'statements'
  | 'ledger'
  | 'attachments'
  | 'accounts'
  | 'income'
  | 'balance'
  | 'names'
  | 'products'
  | 'assistant'

/**
 * Bookkeeping: upload statements → the AI posts every transaction as a double entry →
 * view the ledger, the chart of accounts, income statement and balance sheet, and
 * download the whole ledger (all statements combined) as Excel or PDF.
 *
 * It works on whichever book `BookScopeProvider` names: the general one at
 * `/dashboard/bookkeeping`, or one business's inside "My businesses" (`embedded`: that
 * page has its own header, so this one shows only its download buttons).
 */
export function BookkeepingPage({ embedded = false }: { embedded?: boolean }) {
  const statements = useStatements()
  const assistant = useAssistantEnabled()
  const exporter = useExportLedger()
  const [tab, setTab] = useState<Tab>('statements')
  const [period, setPeriod] = useState<Period>({ from: null, to: null })
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [ledgerAccount, setLedgerAccount] = useState<string | null>(null)
  const [ledgerName, setLedgerName] = useState<string | null>(null)
  const [ledgerSort, setLedgerSort] = useState<SortState | null>(null)
  const [ledgerFocus, setLedgerFocus] = useState<number | null>(null)
  const [ledgerRange, setLedgerRange] = useState<Period>({ from: null, to: null })
  // The Ledger tab's rows are fetched only while it is the open tab.
  const ledger = useTransactions({ enabled: tab === 'ledger' })

  const list = statements.data ?? []
  const done = list.filter((s) => s.status === 'DONE')
  const rowCount = done.reduce((n, s) => n + s.transactionCount, 0)
  const busy = list.some((s) => s.status === 'PENDING' || s.status === 'PROCESSING')
  const unread = list.filter(unreadable).length

  // The reports are fetched only once a report tab is opened.
  const periodValid = !period.from || !period.to || period.from <= period.to
  const reportsTab = tab === 'accounts' || tab === 'income' || tab === 'balance'
  const reports = useReports(period, { enabled: reportsTab && periodValid && done.length > 0 })

  /** The ledger popup, narrowed to an account and/or a payee, in its own order. */
  const openLedger = (scope: LedgerScope) => {
    setLedgerAccount(scope.account ?? null)
    setLedgerName(scope.name ?? null)
    setLedgerSort(scope.sort ?? null)
    setLedgerFocus(null)
    setLedgerRange({ from: scope.from ?? null, to: scope.to ?? null })
    setLedgerOpen(true)
  }
  // A report row opens its account for the period the report shows.
  const openReportLedger = (scope: LedgerScope) => openLedger({ ...scope, from: period.from, to: period.to })
  const openAccount = (account: string) => openReportLedger({ account })
  const openTransaction = (id: number) => {
    setLedgerAccount(null)
    setLedgerName(null)
    setLedgerSort(null)
    setLedgerRange({ from: null, to: null })
    setLedgerFocus(id)
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
      {embedded ? (
        <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
          {exportButton('xlsx', 'Download Excel', FileSpreadsheet)}
          {exportButton('pdf', 'Download PDF', FileText)}
        </div>
      ) : (
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
      )}
      {exporter.error && (
        <p role="alert" className="-mt-4 mb-6 text-sm text-destructive">
          {exporter.error.message}
        </p>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-6">
        <TabsList className="h-auto! w-full flex-wrap justify-start gap-1 rounded-xl bg-white p-1.5 ring-1 ring-black/5 sm:w-fit">
          <TabsTrigger value="statements" className="h-9 flex-none gap-1.5 px-4">
            Statements
            {unread > 0 && (
              <span
                className="rounded-full bg-red-600 px-1.5 text-[11px] leading-[18px] font-semibold text-white"
                title={`${unread} statement${unread === 1 ? '' : 's'} we could not read`}
              >
                {unread}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ledger" className="h-9 flex-none px-4">
            Ledger
          </TabsTrigger>
          <TabsTrigger value="attachments" className="h-9 flex-none px-4">
            Attachments
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
          <TabsTrigger value="names" className="h-9 flex-none px-4">
            Names
          </TabsTrigger>
          <TabsTrigger value="products" className="h-9 flex-none px-4">
            Products
          </TabsTrigger>
          {assistant && (
            <TabsTrigger value="assistant" className="h-9 flex-none gap-1.5 px-4">
              <Sparkles className="size-4" /> Assistant
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="statements">
          <GenerateBar statements={list} />
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

          <DebitCreditGuide />
        </TabsContent>

        <TabsContent value="ledger">
          <LedgerTable
            transactions={ledger.data ?? []}
            statements={list}
            loading={ledger.isLoading}
          />
          {ledger.error && <p className="mt-2 text-sm text-destructive">{ledger.error.message}</p>}
        </TabsContent>

        <TabsContent value="attachments">
          <AttachmentsPanel statements={list} onViewTransaction={openTransaction} />
        </TabsContent>

        {reportsTab && <ReportPeriod value={period} onChange={setPeriod} />}

        <TabsContent value="accounts">
          {report((r) => <ChartOfAccounts reports={r} onOpenAccount={openAccount} />)}
        </TabsContent>
        <TabsContent value="income">
          {report((r) => <IncomeStatement reports={r} onOpen={openReportLedger} />)}
        </TabsContent>
        <TabsContent value="balance">
          {report((r) => <BalanceSheet reports={r} onOpenAccount={openAccount} />)}
        </TabsContent>
        <TabsContent value="names">
          <Names onOpenName={(name) => openLedger({ name })} />
        </TabsContent>
        <TabsContent value="products">
          <Products />
        </TabsContent>
        {assistant && (
          <TabsContent value="assistant">
            <AssistantPanel />
          </TabsContent>
        )}
      </Tabs>

      <LedgerDialog
        open={ledgerOpen}
        onOpenChange={setLedgerOpen}
        statements={list}
        account={ledgerAccount}
        onAccountChange={setLedgerAccount}
        focusId={ledgerFocus}
        onFocusChange={setLedgerFocus}
        name={ledgerName}
        onNameChange={setLedgerName}
        defaultSort={ledgerSort}
        range={ledgerRange}
        onRangeChange={setLedgerRange}
      />
    </>
  )
}
