import type { Statement } from '@/api/bookkeeping'
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
}) {
  const transactions = useTransactions({ enabled: open })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] flex-col gap-4 p-5 sm:max-w-[min(96vw,90rem)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#0B1C2C]">
            Ledger{account && <span className="font-medium text-muted-foreground"> · {account}</span>}
          </DialogTitle>
          <DialogDescription>Downloads always include every statement.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto">
          <LedgerTable
            transactions={transactions.data ?? []}
            statements={statements}
            loading={transactions.isLoading}
            account={account}
            onClearAccount={() => onAccountChange(null)}
            focusId={focusId}
            onClearFocus={() => onFocusChange?.(null)}
          />
          {transactions.error && <p className="mt-2 text-sm text-destructive">{transactions.error.message}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
