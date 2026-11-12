import type { StartReason } from '@/api/bookkeeping'
import { money } from './money'
import { fmtDay } from './period'

/**
 * One start of an account; every one after the first says why (`StartReason`). `amount`
 * (step2, 2026-11-12) = the balance the books start at, on the side the account is shown:
 * a bank's cash, a card's amount OWED.
 */
export type StartingDate = { date: string | null; amount?: number; reason?: StartReason }

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
  // Oldest first; a statement that printed no period still counts — last, with no date.
  const sorted = [...starts].sort((a, b) => (a.date ?? '\uffff').localeCompare(b.date ?? '\uffff'))
  const day = (s: StartingDate) => (s.date ? fmtDay(s.date) : 'an undated statement')
  if (sorted.length < 2) {
    const [only] = sorted
    return only.amount === undefined
      ? { text: `Starting date: ${day(only)}`, warn: false }
      : { text: `Starting balance: ${money(only.amount)} on ${day(only)}`, warn: false }
  }
  const labels = sorted.map((s) => (s.amount === undefined ? day(s) : `${day(s)} (${money(s.amount)})`))
  const reasons = sorted.flatMap((s) => (s.reason ? [startReasonText(s.date, s.reason)] : []))
  return { text: `Starting dates: ${labels.join(' · ')}`, warn: true, ...(reasons.length ? { reasons } : {}) }
}

/** "Jul 1, 2026: missing statement Jun 1, 2026 – Jun 30, 2026" — why the books start again there. */
export function startReasonText(date: string | null, r: StartReason): string {
  const at = date ? fmtDay(date) : 'An undated statement'
  if (r.kind === 'MISSING') {
    // step2 (2026-11-12): the balance jumped across the gap too ($1,024.43 → $0).
    const jump =
      r.previousClosing != null && r.opening != null && Math.round(r.previousClosing * 100) !== Math.round(r.opening * 100)
        ? `, and the balance went from ${money(r.previousClosing)} to ${money(r.opening)}`
        : ''
    return `${at}: missing statement ${fmtDay(r.from)} – ${r.to ? fmtDay(r.to) : 'this one'}${jump}`
  }
  const before = r.previousEnd ? `the statement ending ${fmtDay(r.previousEnd)}` : 'the statement before'
  const closed = r.previousClosing === null ? 'has no closing balance read' : `closes at ${money(r.previousClosing)}`
  return `${at}: balances don't carry over — ${before} ${closed}, this one opens at ${money(r.opening)}`
}

export const STARTS_WARNING =
  'More than one starting date: a statement is missing, or the balances do not carry over from one statement to the next.'
