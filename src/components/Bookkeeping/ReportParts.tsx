import type { ReactNode } from 'react'
import type { Reports, ReportLine } from '@/api/bookkeeping'
import { Skeleton } from '@/components/ui/skeleton'
import { money } from '@/lib/money'
import { cn } from '@/lib/utils'

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

/** A section of a statement: heading, one line per account, and its total. */
export function ReportSection({
  title,
  lines,
  total,
  totalLabel,
  empty = 'Nothing in this period',
}: {
  title: string
  lines: ReportLine[]
  total: number
  totalLabel: string
  empty?: string
}) {
  return (
    <section className="mb-6 last:mb-0">
      <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h4>
      {lines.length ? (
        lines.map((l) => <ReportRow key={l.name} label={l.name} amount={l.amount} />)
      ) : (
        <p className="py-1.5 pl-3 text-sm text-muted-foreground">{empty}</p>
      )}
      <ReportRow label={totalLabel} amount={total} strong />
    </section>
  )
}

export function ReportRow({
  label,
  amount,
  strong,
  className,
}: {
  label: string
  amount: number
  strong?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4 py-1.5 text-sm',
        strong ? 'border-t font-semibold text-[#0B1C2C]' : 'pl-3 text-[#0B1C2C]/90',
        className,
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span className={cn('shrink-0 tabular-nums', amount < 0 && 'text-red-600')}>{money(amount)}</span>
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
