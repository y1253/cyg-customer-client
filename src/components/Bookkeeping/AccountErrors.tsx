import { AlertCircle, AlertTriangle } from 'lucide-react'
import type { StatementProblemKind } from '@/api/bookkeeping'
import { cn } from '@/lib/utils'

/** One open statement error as an account lists it: which statement, and what is wrong. */
export type AccountErrorLine = {
  statementId: number
  /** "Chase 4362 · Sep 2026" — left out where the statement is already shown. */
  statement?: string
  kind: StatementProblemKind | string
  title: string
  text: string
  source: 'SYSTEM' | 'AI' | string
}

/** The kinds that only warn (amber): nothing proved the rows, or the AI noted something. */
const soft = (kind: string) => kind === 'NO_BALANCES' || kind === 'OTHER'

/**
 * step9 (2026-11-15, user's request: "errors from statements should always be shown at the
 * folder, balance sheet and chart of accounts — always all errors"): every open error of an
 * account's statements, never folded away or cut off. Red for a real problem, amber for a
 * warning, like the statement's own badge.
 */
export function AccountErrors({ errors, className }: { errors?: readonly AccountErrorLine[]; className?: string }) {
  if (!errors?.length) return null
  return (
    // Spans only: it sits inside a report row's button too.
    <span className={cn('flex flex-col gap-0.5 text-xs font-normal', className)}>
      {errors.map((e, i) => {
        const Icon = soft(e.kind) ? AlertTriangle : AlertCircle
        return (
          <span
            key={`${e.statementId}:${e.kind}:${i}`}
            className={cn('flex min-w-0 items-start gap-1', soft(e.kind) ? 'text-amber-800' : 'text-red-700')}
          >
            <Icon className="mt-0.5 size-3 shrink-0" />
            <span className="min-w-0 whitespace-normal">
              <span className="font-medium">{e.title}</span>
              {e.statement && <span className="opacity-75"> · {e.statement}</span>}
              {e.source === 'AI' && <span className="opacity-75"> · noted by the AI</span>}
              <span className="block opacity-80">{e.text}</span>
            </span>
          </span>
        )
      })}
    </span>
  )
}
