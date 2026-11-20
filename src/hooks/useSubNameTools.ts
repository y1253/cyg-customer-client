import type { LedgerName } from '@/api/bookkeeping'
import { useNames } from './useNames'
import { useSubNames } from './useSplits'
import { useTax } from './useTax'

/** A name's group as the Names tab shows it: its own, else the one its category gives. */
export const nameGroupOf = (n: LedgerName) => (n.unclarified ? 'OTHER' : (n.group ?? n.type))

/**
 * step12 (2026-11-20): what a sub-name's settings need (`SubNameSettings`) — the sub-name, the
 * book's groups and split rules, and its parent's group and picks (the ones it follows).
 * `sub` is undefined while loading, or when the sub-name is gone.
 */
export function useSubNameTools(subNameId: number | null | undefined) {
  const subs = useSubNames()
  const names = useNames()
  const tax = useTax()
  const sub = subNameId == null ? undefined : subs.data?.find((s) => s.id === subNameId)
  const parent =
    sub && names.data?.names.find((n) => !n.unclarified && n.name.toLowerCase() === sub.parent.toLowerCase())
  return {
    sub,
    loading: subs.isPending || names.isPending,
    groups: names.data?.groups ?? [],
    parentGroup: parent ? nameGroupOf(parent) : 'OTHER',
    agencies: tax.data?.agencies ?? [],
    parentAgencyIds: parent?.agencyIds ?? [],
  }
}
