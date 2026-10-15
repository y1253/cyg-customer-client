import type { Statement } from '@/api/bookkeeping'
import type { SortState } from '@/lib/table-sort'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTransactions } from '@/hooks/useTransactions'
import { LedgerTable } from './LedgerTable'

/**
 * The full ledger in a popup. Its rows are fetched only while it is open, so the page
 * itself never loads thousands of transactions.
 */
export function LedgerDialog({
  open,
  onOpenChange,
  statements,
  account,
  onAccountChange,
  focusId = null,
  onFocusChange,
  name = null,
  onNameChange,
  defaultSort = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  statements: Statement[]
  /** Pre-filter to one account (opened from the chart of accounts). */
  account: string | null
  onAccountChange: (account: string | null) => void
  /** Show one transaction only (from "View transaction" on an attachment). */
  focusId?: number | null
  onFocusChange?: (id: number | null) => void
  /** Pre-filter to one payee (from the Names tab / the income statement). */
  name?: string | null
  onNameChange?: (name: string | null) => void
  /** The order it opens in; null = newest first. */
  defaultSort?: SortState | null
}) {
  const transactions = useTransactions({ enabled: open })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] flex-col gap-4 p-3 sm:max-w-[min(96vw,90rem)] sm:p-5">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#0B1C2C]">
            Ledger{account && <span className="font-medium text-muted-foreground"> · {account}</span>}
            {name && <span className="font-medium text-muted-foreground"> · {name}</span>}
          </DialogTitle>
          <DialogDescription>Downloads always include every statement.</DialogDescription>
        </DialogHeader>
        {/* Scrolls DOWN only: the ledger fits the width at every screen size (`LedgerTable`). */}
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <LedgerTable
            // A new drill-down starts from its own default order, with no column filters.
            key={`${open}|${account ?? ''}|${name ?? ''}|${defaultSort?.key ?? ''}|${focusId ?? ''}`}
            transactions={transactions.data ?? []}
            statements={statements}
            loading={transactions.isLoading}
            account={account}
            onClearAccount={() => onAccountChange(null)}
            focusId={focusId}
            onClearFocus={() => onFocusChange?.(null)}
            name={name}
            onClearName={() => onNameChange?.(null)}
            defaultSort={defaultSort}
          />
          {transactions.error && <p className="mt-2 text-sm text-destructive">{transactions.error.message}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
