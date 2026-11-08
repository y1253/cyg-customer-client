import { useState } from 'react'
import { ruleConflictOf, type RuleConflictLink } from '@/api/bookkeeping'

/** A save waiting for the customer's answer: the links it would move, to which name, and the save again. */
export interface PendingRuleConflict {
  links: RuleConflictLink[]
  name: string
  retry: () => void
}

export type RuleConflictState = ReturnType<typeof useRuleConflict>

/**
 * step2: a name rule save that would take a description from another name answers 409
 * `RULE_CONFLICT`. `offer` turns that error into a question (`RuleConflictDialog`); "Move it"
 * runs `retry` — the same save with `replace: true`. Any other error returns false, so the
 * caller shows it as before.
 */
export function useRuleConflict() {
  const [pending, setPending] = useState<PendingRuleConflict | null>(null)
  return {
    pending,
    offer: (error: unknown, name: string, retry: () => void): boolean => {
      const links = ruleConflictOf(error)
      if (!links) return false
      setPending({ links, name, retry })
      return true
    },
    close: () => setPending(null),
  }
}
