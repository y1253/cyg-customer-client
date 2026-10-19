import type { ReactNode } from 'react'
import type { AccountType, Reports, ReportLine } from '@/api/bookkeeping'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { money } from '@/lib/money'
import { cn } from '@/lib/utils'
import { ForeignAmount } from './AccountCurrency'
import { DropSection, MoveMenu } from './AccountMove'
import { dragProps } from './account-move'

/** Net income to date — a figure, not an account: never opened or moved. */
export const RETAINED_EARNINGS = 'Retained Earnings'

/** The white card every report sits in, with its title and period. */
export function ReportCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      <div className="border-b px-5 py-4">
        <h3 className="text-lg font-bold text-[#0B1C2C]">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

/**
 * A section of a statement: heading, one line per account, and its total.
 * - `onOpen`: an account's row opens its ledger (click).
 * - a line with `byName` shows its total per payee on hover (the income statement).
 * - `type` + `onMove`: rows can be dragged to another section (or "Move to…").
 */
export function ReportSection({
  title,
  lines,
  total,
  totalLabel,
  empty = 'Nothing in this period',
  onOpen,
  type,
  onMove,
  moved,
}: {
  title: string
  lines: ReportLine[]
  total: number
  totalLabel: string
  empty?: string
  onOpen?: (line: ReportLine) => void
  type?: AccountType
  onMove?: (account: string, type: AccountType | null) => void
  /** Accounts the customer already moved (they can be put back). */
  moved?: ReadonlySet<string>
}) {
  return (
    <section className="mb-6 last:mb-0">
      <DropSection type={type ?? 'ASSET'} onMove={type && onMove ? onMove : undefined} className="-mx-1 px-1">
        <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h4>
        {lines.length ? (
          lines.map((l) => {
            const account = l.name !== RETAINED_EARNINGS
            return (
              <ReportRow
                key={l.name}
                label={l.name}
                amount={l.amount}
                foreign={l.currency !== undefined && l.foreignAmount !== undefined ? { currency: l.currency, amount: l.foreignAmount } : undefined}
                byName={l.byName}
                onClick={account && onOpen ? () => onOpen(l) : undefined}
                drag={account && type && onMove ? dragProps(l.name, !!l.bank) : undefined}
                action={
                  account && type && onMove ? (
                    <MoveMenu
                      account={l.name}
                      current={type}
                      bank={!!l.bank}
                      moved={moved?.has(l.name)}
                      onMove={onMove}
                    />
                  ) : undefined
                }
              />
            )
          })
        ) : (
          <p className="py-1.5 pl-3 text-sm text-muted-foreground">{empty}</p>
        )}
      </DropSection>
      <ReportRow label={totalLabel} amount={total} strong />
    </section>
  )
}

/** The hover card of an income-statement line: its total per payee. */
function ByName({ lines }: { lines: ReportLine[] }) {
  const top = lines.slice(0, 12)
  return (
    <div className="flex w-64 flex-col gap-0.5 py-0.5">
      <span className="mb-0.5 text-[11px] font-semibold tracking-wide uppercase opacity-70">By name</span>
      {top.map((l) => (
        <span key={l.name} className="flex justify-between gap-3">
          <span className="truncate">{l.name}</span>
          <span className="shrink-0 tabular-nums">{money(l.amount)}</span>
        </span>
      ))}
      {lines.length > top.length && (
        <span className="opacity-70">+ {lines.length - top.length} more — click to see them all</span>
      )}
    </div>
  )
}

export function ReportRow({
  label,
  amount,
  strong,
  className,
  onClick,
  byName,
  drag,
  action,
  foreign,
}: {
  label: string
  amount: number
  /** A foreign statement account: the amount before conversion, shown small underneath. */
  foreign?: { currency: string; amount: number }
  strong?: boolean
  className?: string
  /** Opens the account's ledger. */
  onClick?: () => void
  /** Shown on hover: the line's total per payee. */
  byName?: ReportLine[]
  drag?: ReturnType<typeof dragProps>
  /** A small button at the end of the row (e.g. "Move to…"). */
  action?: ReactNode
}) {
  const body = (
    <>
      <span className="min-w-0 truncate">{label}</span>
      <span className={cn('ml-auto shrink-0 text-right tabular-nums', amount < 0 && 'text-red-600')}>
        {money(amount)}
        <ForeignAmount currency={foreign?.currency} amount={foreign?.amount} />
      </span>
    </>
  )
  const rowClass = cn(
    'group flex items-center gap-2 py-1.5 text-sm',
    strong ? 'border-t font-semibold text-[#0B1C2C]' : 'pl-3 text-[#0B1C2C]/90',
    (onClick || drag) && 'rounded-md -mx-1 px-1 pl-4 hover:bg-muted/60',
    drag && 'cursor-grab active:cursor-grabbing',
    className,
  )
  const button = onClick ? (
    <button
      type="button"
      onClick={onClick}
      title={byName?.length ? undefined : 'See its transactions'}
      className="flex min-w-0 flex-1 items-baseline gap-4 text-left hover:text-brand"
    >
      {body}
    </button>
  ) : (
    <span className="flex min-w-0 flex-1 items-baseline gap-4">{body}</span>
  )
  return (
    <div className={rowClass} {...drag}>
      {byName?.length && onClick ? (
        <Tooltip>
          <TooltipTrigger
            render={<div className="flex min-w-0 flex-1" />}
            delay={150}
          >
            {button}
          </TooltipTrigger>
          <TooltipContent side="right" align="start" className="block max-w-none">
            <ByName lines={byName} />
          </TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
      {action}
    </div>
  )
}

/** The figures are only as complete as the AI's categories — say so when some are missing. */
export function UncategorizedNote({ reports }: { reports: Reports }) {
  const { count, amount } = reports.uncategorized
  if (!count) return null
  return (
    <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
      {count} transaction{count === 1 ? '' : 's'} ({money(amount)}) could not be categorized and{' '}
      {count === 1 ? 'is' : 'are'} counted under “Uncategorized” expenses.
    </p>
  )
}

export function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white p-5 ring-1 ring-black/5">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-8" />
      ))}
    </div>
  )
}
