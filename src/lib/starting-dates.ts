import type { StartDerived, StartReason } from '@/api/bookkeeping'
import i18n from '@/i18n'
import { money } from './money'
import { fmtDay } from './period'

/**
 * One start of an account; every one after the first says why (`StartReason`). `amount`
 * (step2, 2026-11-12) = the balance the books start at, on the side the account is shown:
 * a bank's cash, a card's amount OWED.
 */
export type StartingDate = { date: string | null; amount?: number; derived?: StartDerived; reason?: StartReason }

/** Why a start's amount was not printed (step2, 2026-11-13): it was worked out, or set at $0. */
const derivedText = (d: StartDerived) => i18n.t(`books:starts.derived.${d}`)

const dayOf = (s: StartingDate) => (s.date ? fmtDay(s.date) : i18n.t('books:starts.undated'))

/** Oldest first; a statement that printed no period still counts — last, with no date. */
const oldestFirst = (starts: ReadonlyArray<StartingDate>) =>
  [...starts].sort((a, b) => (a.date ?? '￿').localeCompare(b.date ?? '￿'))

/** "Dec 29, 2023 (1,200.00) · Oct 31, 2024 (0.00)" — every start of an account, oldest first. */
export function startingDatesList(starts: ReadonlyArray<StartingDate>): string {
  return oldestFirst(starts)
    .map((s) =>
      s.amount === undefined
        ? dayOf(s)
        : i18n.t(s.derived ? 'books:starts.dateAmountWorked' : 'books:starts.dateAmount', {
            date: dayOf(s),
            amount: money(s.amount),
          }),
    )
    .join(' · ')
}

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
  if (!starts.length)
    return fallbackDate
      ? { text: i18n.t('books:starts.date', { date: fmtDay(fallbackDate.slice(0, 10)) }), warn: false }
      : null
  const sorted = oldestFirst(starts)
  if (sorted.length < 2) {
    const [only] = sorted
    if (only.amount === undefined) return { text: i18n.t('books:starts.date', { date: dayOf(only) }), warn: false }
    const text = i18n.t('books:starts.balance', { amount: money(only.amount), date: dayOf(only) })
    return { text: only.derived ? `${text} (${derivedText(only.derived)})` : text, warn: false }
  }
  const reasons = sorted.flatMap((s) => (s.reason ? [startReasonText(s.date, s.reason)] : []))
  return {
    text: i18n.t('books:starts.dates', { dates: startingDatesList(sorted) }),
    warn: true,
    ...(reasons.length ? { reasons } : {}),
  }
}

/** "Jul 1, 2026: missing statement Jun 1, 2026 – Jun 30, 2026" — why the books start again there. */
export function startReasonText(date: string | null, r: StartReason): string {
  const at = date ? fmtDay(date) : i18n.t('books:starts.undatedCap')
  if (r.kind === 'MISSING') {
    // step2 (2026-11-12): the balance jumped across the gap too ($1,024.43 → $0).
    const jumped =
      r.previousClosing != null && r.opening != null && Math.round(r.previousClosing * 100) !== Math.round(r.opening * 100)
    const vars = { at, from: fmtDay(r.from), to: r.to ? fmtDay(r.to) : i18n.t('books:starts.thisOne') }
    return jumped
      ? i18n.t('books:starts.missingJump', { ...vars, before: money(r.previousClosing!), after: money(r.opening!) })
      : i18n.t('books:starts.missing', vars)
  }
  const before = r.previousEnd
    ? i18n.t('books:starts.statementEnding', { date: fmtDay(r.previousEnd) })
    : i18n.t('books:starts.statementBefore')
  if (r.kind === 'REVIEW') return i18n.t('books:starts.review', { at, before })
  return r.previousClosing === null
    ? i18n.t('books:starts.mismatchNoClosing', { at, before, opening: money(r.opening) })
    : i18n.t('books:starts.mismatch', { at, before, closing: money(r.previousClosing), opening: money(r.opening) })
}

/** The warning beside an account whose books start more than once. */
export const startsWarning = () => i18n.t('books:starts.warning')
