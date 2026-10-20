import { fmtDay } from './period'

/**
 * How an account's starting balances read, on the Statements folders and the balance
 * sheet. One start is normal (the account's first statement). More than one means the
 * chain broke — a statement is missing, or the balances do not carry over — so it warns.
 */
export function startingNote(
  starts: ReadonlyArray<{ date: string | null }>,
): { text: string; warn: boolean } | null {
  if (!starts.length) return null
  const dates = starts
    .map((s) => s.date)
    .filter((d): d is string => !!d)
    .sort()
    .map(fmtDay)
  // A statement that printed no period still counts; it just has no date to show.
  const undated = starts.length - dates.length
  const labels = [...dates, ...Array<string>(undated).fill('an undated statement')]
  const [first, ...rest] = labels
  return rest.length
    ? { text: `Starts ${first} · restarts ${rest.join(', ')}`, warn: true }
    : { text: `Starts ${first}`, warn: false }
}

export const STARTS_WARNING =
  'More than one starting balance: a statement is missing, or the balances do not carry over from one statement to the next.'
