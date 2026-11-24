import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AccountStatementError, AccountType, Reports, ReportLine } from '@/api/bookkeeping'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { money } from '@/lib/money'
import { cn } from '@/lib/utils'
import { startingDatesList, startingNote, startsWarning } from '@/lib/starting-dates'
import { AccountErrors } from './AccountErrors'
import { ForeignAmount } from './AccountCurrency'
import { DropSection, MoveMenu } from './AccountMove'
import { dragProps, useAccountDrop } from './account-move'
import { InlineRename } from './InlineRename'
import { canRenameAccount } from '@/lib/account-names'

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
  empty,
  onOpen,
  type,
  onMove,
  moved,
  onMerge,
  onRename,
  onAskStarts,
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
  /** step8: an account dropped on another's row is merged into it (after a confirm). */
  onMerge?: (from: string, into: string, bank: boolean) => void
  /** step2: rename an account in place (its pencil); throws to keep the field open. */
  onRename?: (from: string, to: string) => Promise<unknown>
  /** step2: an account with more than one starting date gets "Ask AI" (its statements' chat). */
  onAskStarts?: (account: string, note: string) => void
}) {
  const { t } = useTranslation(['books', 'common'])
  return (
    <section className="mb-6 last:mb-0">
      <DropSection type={type ?? 'ASSET'} onMove={type && onMove ? onMove : undefined} className="-mx-1 px-1">
        <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h4>
        {lines.length ? (
          lines.map((l) => {
            const account = l.name !== RETAINED_EARNINGS
            const note = l.starts ? (startingNote(l.starts) ?? undefined) : undefined
            const ask =
              note?.warn && onAskStarts ? (
                <button
                  type="button"
                  title={t('reports.askStarts')}
                  aria-label={t('reports.askStarts')}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-brand hover:bg-brand/10"
                  onClick={() => onAskStarts(l.name, [startingDatesList(l.starts ?? []), ...(note.reasons ?? [])].join('. '))}
                >
                  <Sparkles className="size-4" />
                </button>
              ) : null
            return (
              <ReportRow
                key={l.name}
                label={l.name}
                amount={l.amount}
                foreign={l.currency !== undefined && l.foreignAmount !== undefined ? { currency: l.currency, amount: l.foreignAmount } : undefined}
                byName={l.byName}
                note={note}
                errors={l.errors}
                onClick={account && onOpen ? () => onOpen(l) : undefined}
                drag={account && type && onMove ? dragProps(l.name, !!l.bank) : undefined}
                merge={
                  account && type && onMerge
                    ? { bank: !!l.bank, onMerge: (from) => onMerge(from, l.name, !!l.bank) }
                    : undefined
                }
                rename={account && onRename && canRenameAccount(l) ? (to) => onRename(l.name, to) : undefined}
                action={
                  account && type && onMove ? (
                    <>
                      {ask}
                      <MoveMenu
                        account={l.name}
                        current={type}
                        bank={!!l.bank}
                        moved={moved?.has(l.name)}
                        onMove={onMove}
                      />
                    </>
                  ) : (
                    (ask ?? undefined)
                  )
                }
              />
            )
          })
        ) : (
          <p className="py-1.5 pl-3 text-sm text-muted-foreground">{empty ?? t('reports.emptyPeriod')}</p>
        )}
      </DropSection>
      <ReportRow label={totalLabel} amount={total} strong />
    </section>
  )
}

/** step2 (2026-11-09): how the By-name card is sorted — kept for the next card (this browser). */
type ByNameSort = { key: 'name' | 'amount'; dir: 'asc' | 'desc' }
const BY_NAME_SORT_KEY = 'by-name-sort'
const DEFAULT_BY_NAME_SORT: ByNameSort = { key: 'amount', dir: 'desc' }

function readByNameSort(): ByNameSort {
  try {
    const v = JSON.parse(localStorage.getItem(BY_NAME_SORT_KEY) ?? 'null') as ByNameSort | null
    if (v && (v.key === 'name' || v.key === 'amount') && (v.dir === 'asc' || v.dir === 'desc')) return v
  } catch {
    // Storage blocked or bad JSON: the default order.
  }
  return DEFAULT_BY_NAME_SORT
}

/**
 * The hover card of an income-statement line: its total per payee — EVERY name (step8),
 * scrolling inside the card when there are more than fit (the card stays open while the
 * pointer is on it). step2 (2026-11-09): the Name and Amount headers sort it (click again
 * to reverse); the server's order is amount, largest first.
 */
function ByName({ lines }: { lines: ReportLine[] }) {
  const { t } = useTranslation(['books', 'common'])
  const [sort, setSort] = useState(readByNameSort)
  const sorted = useMemo(() => {
    const out = [...lines].sort((a, b) =>
      sort.key === 'name'
        ? a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        : Math.abs(a.amount) - Math.abs(b.amount) || a.name.localeCompare(b.name),
    )
    return sort.dir === 'desc' ? out.reverse() : out
  }, [lines, sort])
  const pick = (key: ByNameSort['key']) => {
    const next: ByNameSort =
      sort.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }
    setSort(next)
    try {
      localStorage.setItem(BY_NAME_SORT_KEY, JSON.stringify(next))
    } catch {
      // Not remembered — still sorted now.
    }
  }
  const header = (key: ByNameSort['key'], label: string) => {
    const on = sort.key === key
    const Arrow = sort.dir === 'asc' ? ArrowUp : ArrowDown
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          pick(key)
        }}
        title={t('reports.sortBy', { label: label.toLocaleLowerCase() })}
        className={cn(
          'inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[11px] font-semibold tracking-wide uppercase transition-colors hover:bg-white/15',
          on ? 'opacity-100' : 'opacity-60 hover:opacity-90',
        )}
      >
        {label}
        {on && <Arrow className="size-3" />}
      </button>
    )
  }
  return (
    <div className="flex w-72 flex-col py-0.5">
      <span className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1">
          {header('name', t('reports.byName'))}
          {lines.length > 1 && <span className="text-[11px] opacity-60">· {lines.length}</span>}
        </span>
        {header('amount', t('reports.amount'))}
      </span>
      <div className="-mr-2 flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto overscroll-contain pr-2">
        {sorted.map((l) => (
          <span key={l.name} className="flex justify-between gap-3">
            <span className="truncate" title={l.name}>
              {l.name}
            </span>
            <span className="shrink-0 tabular-nums">{money(l.amount)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** A statement account's starting-balance line (`startingNote`); `warn` = red. */
export type AccountStartNote = { text: string; warn: boolean; reasons?: string[] }

/**
 * Under a statement account's name: where its books start, then (step9, 2026-11-15) every
 * open error of its statements. Spans only — it sits inside a report row's button.
 */
export function AccountNote({ note, errors }: { note?: AccountStartNote | null; errors?: AccountStatementError[] }) {
  return (
    <>
      {note && (
        <span className={cn('text-xs font-normal', note.warn ? 'text-red-600' : 'truncate text-muted-foreground')}>
          {note.text}
          {/* step8: the whole list of dates, and why more than one is a problem — never cut off. */}
          {/* Why each later start is there; the general warning only when no reason is known. */}
          {note.warn &&
            (note.reasons?.length ? (
              note.reasons.map((r) => (
                <span key={r} className="block text-red-600/80">
                  {r}
                </span>
              ))
            ) : (
              <span className="block text-red-600/80">{startsWarning()}</span>
            ))}
        </span>
      )}
      <AccountErrors errors={errors} className="mt-0.5" />
    </>
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
  note,
  errors,
  merge,
  rename,
}: {
  label: string
  amount: number
  /** A small line under the label (a statement account's start dates); `warn` = red. */
  note?: AccountStartNote
  /** step9: a statement account's open statement errors, listed under the label. */
  errors?: AccountStatementError[]
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
  /** step8: this row takes another account dropped on it — merged into this one. */
  merge?: { bank: boolean; onMerge: (from: string) => void }
  /** step2: a pencil beside the name renames the account in place. */
  rename?: (to: string) => Promise<unknown>
}) {
  const { t } = useTranslation(['books', 'common'])
  const drop = useAccountDrop(label, merge?.bank ?? false, merge?.onMerge)
  const body = (
    <>
      {note || errors?.length ? (
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{label}</span>
          <AccountNote note={note} errors={errors} />
        </span>
      ) : (
        <span className="min-w-0 truncate">{label}</span>
      )}
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
    drop.over && 'bg-brand/10 ring-2 ring-brand/40',
    className,
  )
  const button = onClick ? (
    <button
      type="button"
      onClick={onClick}
      title={byName?.length ? undefined : t('reports.seeTransactions')}
      className="flex min-w-0 flex-1 items-baseline gap-4 text-left hover:text-brand"
    >
      {body}
    </button>
  ) : (
    <span className="flex min-w-0 flex-1 items-baseline gap-4">{body}</span>
  )
  const main =
    byName?.length && onClick ? (
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
    )
  return (
    <div className={rowClass} {...drag} {...drop.props}>
      {rename ? (
        <InlineRename value={label} onSave={rename} label={t('statements.renameAccount', { name: label })} className="flex-1">
          {main}
        </InlineRename>
      ) : (
        main
      )}
      {action}
    </div>
  )
}

/** The figures are only as complete as the AI's categories — say so when some are missing. */
export function UncategorizedNote({ reports }: { reports: Reports }) {
  const { t } = useTranslation(['books', 'common'])
  const { count, amount } = reports.uncategorized
  if (!count) return null
  return (
    <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
      {t('reports.uncategorized', { count, amount: money(amount) })}
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
