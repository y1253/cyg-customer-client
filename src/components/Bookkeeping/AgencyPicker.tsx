import { useState } from 'react'
import { Split } from 'lucide-react'
import { rateLabel, type TaxAgency } from '@/api/bookkeeping'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { useTax } from '@/hooks/useTax'
import { cn } from '@/lib/utils'

/**
 * step9 (2026-11-17): one switch of the picker — an individual rule, or a split group (all its rules). step9
 * (2026-11-19): `alone` = one rule of a group picked ON ITS OWN (`inGroup` = its group's name).
 */
type Unit = {
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
 * The rules as switches: each split group once (where its first rule is), then each of its rules on its own; each
 * individual rule on its own.
 */
function pickerUnits(agencies: TaxAgency[], groupName: (id: number) => string | undefined): Unit[] {
  const units: Unit[] = []
  const seen = new Set<number>()
  for (const a of agencies) {
    if (a.groupId === null) {
      units.push({
        key: `r${a.id}`,
        name: a.name,
        ids: [a.id],
        detail: a.rates.map(rateLabel).join(' · '),
        active: a.active,
        group: false,
        alone: false,
      })
      continue
    }
    if (seen.has(a.groupId)) continue
    seen.add(a.groupId)
    const members = agencies.filter((m) => m.groupId === a.groupId)
    const group = groupName(a.groupId) ?? 'Group'
    units.push({
      key: `g${a.groupId}`,
      name: group,
      ids: members.map((m) => m.id),
      detail: members.map((m) => `${m.name} ${m.rates.map(rateLabel).join(' · ')}`).join(' + '),
      // step9 (2026-11-18): every member carries its group's switch.
      active: members.some((m) => m.active),
      group: true,
      alone: false,
    })
    // step9 (2026-11-19): each rule of the group can be picked on its own too.
    for (const m of members)
      units.push({
        key: `a${m.id}`,
        name: m.name,
        ids: [m.id],
        detail: m.rates.map(rateLabel).join(' · '),
        active: m.active,
        group: false,
        alone: true,
        inGroup: group,
      })
  }
  return units
}

/**
 * step9 part 4 (2026-11-15): the SPLIT RULES of one name (were tax agencies): a chip with what is picked ("No
 * split rules" by default), opening a list with a switch per rule. Picking a rule is a one-time command — it
 * splits the name's existing transactions now (asked first), and new ones as they come in. Turning one off
 * leaves the splits it made. `rows` = how many transactions the name has (for the question); `draft` = a name
 * not saved yet: picks are only held, nothing is asked.
 *
 * step9 (2026-11-17): a split group is ONE switch — it turns all its rules on or off together.
 *
 * step9 (2026-11-18, part 3): ONE pick per name — a single rule or a single group. Turning one on replaces what was
 * picked (its splits stay); several rules together = put them in a split group and pick the group.
 *
 * step9 (2026-11-19): a rule of a group can also be picked ON ITS OWN (`alone`, listed under its group) — it then
 * splits like an individual rule.
 */
export function AgencyPicker({
  name,
  agencies,
  picked,
  alone = false,
  pending,
  onChange,
  rows,
  draft,
}: {
  name: string
  agencies: TaxAgency[]
  picked: number[]
  /** step9 (2026-11-19): `picked` is one rule of a group taken on its own. */
  alone?: boolean
  pending: boolean
  onChange: (agencyIds: number[], alone: boolean) => void
  rows?: number
  draft?: boolean
}) {
  const groups = useTax().data?.groups ?? []
  const units = pickerUnits(agencies, (id) => groups.find((g) => g.id === id)?.name)
  const isOn = (u: Unit) => u.alone === alone && u.ids.some((id) => picked.includes(id))
  const chosen = units.filter(isOn)
  /** A rule (or group) switched on, waiting for "Split them". */
  const [asking, setAsking] = useState<Unit | null>(null)
  /** What turning `u` on replaces. */
  const replaced = (u: Unit) => chosen.filter((c) => c.key !== u.key)
  const turn = (u: Unit, on: boolean) => {
    if (!on) return onChange([], false)
    if (draft || rows === 0) return onChange(u.ids, u.alone)
    setAsking(u)
  }
  return (
    <Popover onOpenChange={(open) => !open && setAsking(null)}>
      <PopoverTrigger
        disabled={pending}
        title={`Split rules of ${name}`}
        className={cn(
          'inline-flex max-w-44 shrink-0 items-center gap-1 truncate rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors',
          chosen.length
            ? 'bg-amber-50 text-amber-800 ring-amber-600/20 hover:bg-amber-100'
            : 'text-muted-foreground ring-black/10 hover:bg-muted',
        )}
      >
        <Split className="size-3.5 shrink-0" />
        <span className="truncate">
          {chosen.length
            ? chosen.map((a) => (a.inGroup ? `${a.name} (alone)` : a.name)).join(', ')
            : 'No split rules'}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="text-xs font-medium text-muted-foreground">Split rules of {name}</p>
        {asking ? (
          <div className="grid gap-2 rounded-md bg-muted/50 p-2 text-sm">
            <p>
              Split {rows !== undefined ? `the ${rows} transaction${rows === 1 ? '' : 's'}` : 'the transactions'} of{' '}
              <span className="font-medium">{name}</span> by <span className="font-medium">{asking.name}</span> now?
            </p>
            {replaced(asking).length > 0 && (
              <p className="text-xs text-amber-800">
                This replaces {replaced(asking).map((c) => c.name).join(', ')} — the splits it made stay.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              New transactions of {name} are split as they come in. The splits are regular splits — you can change
              them afterwards.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setAsking(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                className="bg-brand text-white hover:bg-brand/85"
                onClick={() => {
                  onChange(asking.ids, asking.alone)
                  setAsking(null)
                }}
              >
                Split them
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-1">
              {units.map((u) => (
                <li key={u.key} className={cn(u.inGroup && 'pl-5')}>
                  <label
                    className={cn('flex items-center gap-2.5 rounded-md px-1.5 py-1 text-sm', !u.active && 'opacity-60')}
                    title={u.inGroup ? `${u.name} on its own — not with the rest of ${u.inGroup}` : undefined}
                  >
                    <Switch
                      checked={isOn(u)}
                      disabled={pending}
                      onCheckedChange={(v) => turn(u, v)}
                      className="data-checked:bg-brand"
                    />
                    {u.group ? (
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">
                          {u.name} <span className="text-xs text-muted-foreground">(group)</span>
                        </span>
                        <span className="block truncate text-xs text-muted-foreground tabular-nums" title={u.detail}>
                          {u.detail}
                        </span>
                      </span>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 truncate">
                          {u.name}
                          {u.inGroup && <span className="text-xs text-muted-foreground"> alone</span>}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{u.detail}</span>
                      </>
                    )}
                  </label>
                </li>
              ))}
            </ul>
            {chosen.length > 1 && (
              <p className="text-[11px] text-amber-800">{name} has several picks — pick one.</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              One split rule or one group per name — to use several rules together, put them in a split group. A
              group's rule picked alone splits on its own, not with its group.
            </p>
            {chosen.length > 0 && !draft && (
              <p className="text-[11px] text-muted-foreground">Turning one off keeps the splits it already made.</p>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
