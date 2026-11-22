import { rateLabel, type TaxAgency } from '@/api/bookkeeping'
import { sortByLabel } from '@/lib/sort'

/**
 * step9 (2026-11-17): one switch of the picker — an individual rule, or a split group (all its rules). step9
 * (2026-11-19): `alone` = one rule of a group picked ON ITS OWN (`inGroup` = its group's name).
 */
export type Unit = {
  key: string
  name: string
  ids: number[]
  detail: string
  active: boolean
  group: boolean
  alone: boolean
  inGroup?: string
}

/**
 * The rules as switches: each split group once, then each of its rules on its own; each individual rule on its own.
 * step12 (2026-11-22): A–Z — groups and individual rules together by name, a group's rules A–Z under it.
 */
export function pickerUnits(agencies: TaxAgency[], groupName: (id: number) => string | undefined): Unit[] {
  const blocks: Unit[][] = []
  const seen = new Set<number>()
  for (const a of agencies) {
    if (a.groupId === null) {
      blocks.push([
        {
          key: `r${a.id}`,
          name: a.name,
          ids: [a.id],
          detail: a.rates.map(rateLabel).join(' · '),
          active: a.active,
          group: false,
          alone: false,
        },
      ])
      continue
    }
    if (seen.has(a.groupId)) continue
    seen.add(a.groupId)
    const members = sortByLabel(
      agencies.filter((m) => m.groupId === a.groupId),
      (m) => m.name,
    )
    const group = groupName(a.groupId) ?? 'Group'
    blocks.push([
      {
        key: `g${a.groupId}`,
        name: group,
        ids: members.map((m) => m.id),
        detail: members.map((m) => `${m.name} ${m.rates.map(rateLabel).join(' · ')}`).join(' + '),
        // step9 (2026-11-18): every member carries its group's switch.
        active: members.some((m) => m.active),
        group: true,
        alone: false,
      },
      // step9 (2026-11-19): each rule of the group can be picked on its own too.
      ...members.map((m) => ({
        key: `a${m.id}`,
        name: m.name,
        ids: [m.id],
        detail: m.rates.map(rateLabel).join(' · '),
        active: m.active,
        group: false,
        alone: true,
        inGroup: group,
      })),
    ])
  }
  return sortByLabel(blocks, (b) => b[0].name).flat()
}
