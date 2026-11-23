import type { Period, Statement } from '@/api/bookkeeping'
import type { SortState } from '@/lib/table-sort'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LedgerTable } from './LedgerTable'

const NO_RANGE: Period = { from: null, to: null }

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
  description = null,
  onDescriptionChange,
  subName = null,
  onSubNameChange,
  defaultSort = null,
  range = NO_RANGE,
  onRangeChange,
  statementId = null,
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
  /** step2 (2026-11-15): pre-filter to one description (clicked on the Names tab). */
  description?: string | null
  onDescriptionChange?: (description: string | null) => void
  /** step9: only the rows of one sub-name (the Names tab popup). */
  subName?: { id: number; name: string } | null
  onSubNameChange?: (subName: null) => void
  /** The order it opens in; null = newest first. */
  defaultSort?: SortState | null
  /** Only rows dated in this period (a report drill-down opens with the report's). */
  range?: Period
  onRangeChange?: (range: Period) => void
  /** step2 (2026-11-11): open on one statement's rows. */
  statementId?: number | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] flex-col gap-4 p-3 sm:max-w-[min(96vw,90rem)] sm:p-5">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#0B1C2C]">
            Ledger{account && <span className="font-medium text-muted-foreground"> · {account}</span>}
            {name && <span className="font-medium text-muted-foreground"> · {name}</span>}
            {description && <span className="font-medium text-muted-foreground"> · “{description}”</span>}
            {subName && <span className="font-medium text-muted-foreground"> · {subName.name}</span>}
          </DialogTitle>
          <DialogDescription>Downloads always include every statement.</DialogDescription>
        </DialogHeader>
        {/* Scrolls DOWN; a ledger wider than the dialog (custom columns) scrolls sideways inside
            the table, with its scrollbar kept at the top of this box (`StickyScrollbar`, top 0). */}
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [--bk-sticky-top:0px]">
          <LedgerTable
            // A new drill-down starts from its own default order, with no column filters.
            key={`${open}|${account ?? ''}|${name ?? ''}|${description ?? ''}|${subName?.id ?? ''}|${defaultSort?.key ?? ''}|${focusId ?? ''}|${range.from ?? ''}|${range.to ?? ''}|${statementId ?? ''}`}
            statements={statements}
            enabled={open}
            account={account}
            onClearAccount={() => onAccountChange(null)}
            focusId={focusId}
            onClearFocus={() => onFocusChange?.(null)}
            name={name}
            onClearName={() => onNameChange?.(null)}
            description={description}
            onClearDescription={() => onDescriptionChange?.(null)}
            subName={subName}
            onClearSubName={() => onSubNameChange?.(null)}
            defaultSort={defaultSort}
            from={range.from}
            to={range.to}
            onClearRange={() => onRangeChange?.(NO_RANGE)}
            statementId={statementId}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
