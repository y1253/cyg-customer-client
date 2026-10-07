import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import type { ExportFormat } from '@/api/bookkeeping'
import { PageHeader } from '@/components/Dashboard/PageHeader'
import { Button } from '@/components/ui/button'
import { useExportLedger } from '@/hooks/useExportLedger'
import { useStatements } from '@/hooks/useStatements'
import { useTransactions } from '@/hooks/useTransactions'
import { DebitCreditGuide } from './DebitCreditGuide'
import { LedgerTable } from './LedgerTable'
import { StatementsList } from './StatementsList'
import { UploadDropzone } from './UploadDropzone'

/**
 * Bookkeeping: upload statements → the AI posts every transaction as a double entry →
 * download the whole ledger (all statements combined) as Excel or PDF.
 */
export function BookkeepingPage() {
  const statements = useStatements()
  const transactions = useTransactions()
  const exporter = useExportLedger()
  const list = statements.data ?? []
  const rows = transactions.data ?? []
  const busy = list.some((s) => s.status === 'PENDING' || s.status === 'PROCESSING')

  const exportButton = (format: ExportFormat, label: string, Icon: typeof FileText) => {
    const pending = exporter.isPending && exporter.variables === format
    return (
      <Button
        variant={format === 'xlsx' ? 'default' : 'outline'}
        disabled={!rows.length || exporter.isPending}
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
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Ledger</h2>
          <p className="text-xs text-muted-foreground">Downloads always include every statement.</p>
        </div>
        <LedgerTable transactions={rows} statements={list} loading={transactions.isLoading} />
        {transactions.error && <p className="mt-2 text-sm text-destructive">{transactions.error.message}</p>}
      </section>

      <DebitCreditGuide />
    </>
  )
}
