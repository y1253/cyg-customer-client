import i18n from '@/i18n'
import type { Statement, StatementProblemKind } from '@/api/bookkeeping'

type HelpKey =
  | 'ENDING'
  | 'RUNNING'
  | 'NO_OPENING'
  | 'OTHER'
  | 'MISMATCH'
  | 'MISSING'
  | 'NO_BALANCES'
  | 'NEEDS_REVIEW'
  | 'PASSWORD'
  | 'NOT_STATEMENT'
  | 'DAMAGED'
  | 'GENERIC'

const help = (k: HelpKey): { what: string; todo: string[] } => ({
  what: i18n.t(`books:help.${k}.what`),
  todo: [...i18n.t(`books:help.${k}.todo`, { returnObjects: true })],
})

/**
 * step8: what a statement we could not read MEANS and what the customer can do — shown
 * under "Details" next to the exact reason (`error`) and the checks that failed (`checks`).
 */
export function statementHelp(
  s: Pick<Statement, 'status' | 'error'>,
  problem?: StatementProblemKind,
): { what: string; todo: string[] } | null {
  // step2 (2026-11-12): read and in the books, but its own rows don't reach its ending balance.
  if (problem === 'ENDING') return help('ENDING')
  // step9 (2026-11-15): the running balance on its last row isn't its ending balance.
  if (problem === 'RUNNING') return help('RUNNING')
  if (problem === 'NO_OPENING') return help('NO_OPENING')
  if (problem === 'OTHER') return help('OTHER')
  // step2 (2026-11-11): a read statement whose balances don't carry over / have a gap.
  if (problem === 'MISMATCH') return help('MISMATCH')
  if (problem === 'MISSING') return help('MISSING')
  if (problem === 'NO_BALANCES') return help('NO_BALANCES')
  if (s.status === 'NEEDS_REVIEW') return help('NEEDS_REVIEW')
  if (s.status !== 'FAILED') return null
  // The server's reason is English; these tests only pick which help to show.
  const reason = s.error ?? ''
  if (/password/i.test(reason)) return help('PASSWORD')
  if (/not look like a bank|credit-card statement/i.test(reason)) return help('NOT_STATEMENT')
  if (/could not be opened|no pages/i.test(reason)) return help('DAMAGED')
  return help('GENERIC')
}
