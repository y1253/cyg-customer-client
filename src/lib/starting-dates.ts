import type { StartReason } from '@/api/bookkeeping'
import { money } from './money'
import { fmtDay } from './period'

/** One start of an account; every one after the first says why (`StartReason`). */
export type StartingDate = { date: string | null; reason?: StartReason }

/**
 * How an account's starting balances read, on the Statements folders and the balance
 * sheet. One start is normal (the account's first statement) and is always shown, in grey.
 * More than one means the chain broke — a statement is missing, or the balances do not
 * carry over — so it warns (red). An account with no Starting balance row (its first
 * opening was $0 or not read) still shows where its books start: `fallbackDate`, the
 * account's first statement day (user's request, step12). `reasons`: one line per later
 * start saying which of the two it is (2026-11-10, user's request).
 */
export function startingNote(
  starts: ReadonlyArray<StartingDate>,
  fallbackDate?: string | null,
): { text: string; warn: boolean; reasons?: string[] } | null {
  if (!starts.length) return fallbackDate ? { text: `Starting date: ${fmtDay(fallbackDate.slice(0, 10))}`, warn: false } : null
  const dates = starts
    .map((s) => s.date)
    .filter((d): d is string => !!d)
    .sort()
    .map(fmtDay)
  // A statement that printed no period still counts; it just has no date to show.
  const undated = starts.length - dates.length
  const labels = [...dates, ...Array<string>(undated).fill('an undated statement')]
  if (labels.length < 2) return { text: `Starting date: ${labels[0]}`, warn: false }
  // Oldest first, undated last — the same order as the dates.
  const reasons = [...starts]
    .sort((a, b) => (a.date ?? '\uffff').localeCompare(b.date ?? '\uffff'))
    .flatMap((s) => (s.reason ? [startReasonText(s.date, s.reason)] : []))
  return { text: `Starting dates: ${labels.join(' · ')}`, warn: true, ...(reasons.length ? { reasons } : {}) }
}

/** "Jul 1, 2026: missing statement Jun 1, 2026 – Jun 30, 2026" — why the books start again there. */
export function startReasonText(date: string | null, r: StartReason): string {
  const at = date ? fmtDay(date) : 'An undated statement'
  if (r.kind === 'MISSING') return `${at}: missing statement ${fmtDay(r.from)} – ${r.to ? fmtDay(r.to) : 'this one'}`
  const before = r.previousEnd ? `the statement ending ${fmtDay(r.previousEnd)}` : 'the statement before'
  const closed = r.previousClosing === null ? 'has no closing balance read' : `closes at ${money(r.previousClosing)}`
  return `${at}: balances don't carry over — ${before} ${closed}, this one opens at ${money(r.opening)}`
}

export const STARTS_WARNING =
  'More than one starting date: a statement is missing, or the balances do not carry over from one statement to the next.'
