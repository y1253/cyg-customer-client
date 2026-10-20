import { fmtDay } from './period'

/**
 * How an account's starting balances read, on the Statements folders and the balance
 * sheet. One start is normal (the account's first statement) and is always shown, in grey.
 * More than one means the chain broke — a statement is missing, or the balances do not
 * carry over — so it warns (red). An account with no Starting balance row (its first
 * opening was $0 or not read) still shows where its books start: `fallbackDate`, the
 * account's first statement day (user's request, step12).
 */
export function startingNote(
  starts: ReadonlyArray<{ date: string | null }>,
  fallbackDate?: string | null,
): { text: string; warn: boolean } | null {
  if (!starts.length) return fallbackDate ? { text: `Starting date: ${fmtDay(fallbackDate.slice(0, 10))}`, warn: false } : null
  const dates = starts
    .map((s) => s.date)
    .filter((d): d is string => !!d)
    .sort()
    .map(fmtDay)
  // A statement that printed no period still counts; it just has no date to show.
  const undated = starts.length - dates.length
  const labels = [...dates, ...Array<string>(undated).fill('an undated statement')]
  return labels.length > 1
    ? { text: `Starting dates: ${labels.join(' · ')}`, warn: true }
    : { text: `Starting date: ${labels[0]}`, warn: false }
}

export const STARTS_WARNING =
  'More than one starting date: a statement is missing, or the balances do not carry over from one statement to the next.'
