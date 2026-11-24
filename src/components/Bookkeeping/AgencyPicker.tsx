import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Split } from 'lucide-react'
import type { TaxAgency } from '@/api/bookkeeping'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { useTax } from '@/hooks/useTax'
import { cn } from '@/lib/utils'
import { pickerUnits, type Unit } from './split-rule-units'

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
  const { t } = useTranslation(['names', 'common'])
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
        title={t('picker.title', { name })}
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
            ? chosen.map((a) => (a.inGroup ? t('picker.alone', { name: a.name }) : a.name)).join(', ')
            : t('picker.none')}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="text-xs font-medium text-muted-foreground">{t('picker.title', { name })}</p>
        {asking ? (
          <div className="grid gap-2 rounded-md bg-muted/50 p-2 text-sm">
            <p>
              <Trans
                t={t}
                i18nKey={rows !== undefined ? 'picker.ask' : 'picker.askNoCount'}
                count={rows}
                values={{ name, rule: asking.name }}
                components={{ b: <span className="font-medium" /> }}
              />
            </p>
            {replaced(asking).length > 0 && (
              <p className="text-xs text-amber-800">
                {t('picker.replaces', { list: replaced(asking).map((c) => c.name).join(', ') })}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('picker.newOnes', { name })}
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setAsking(null)}>
                {t('common:actions.cancel')}
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
                {t('picker.splitThem')}
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
                    title={u.inGroup ? t('picker.aloneTitle', { name: u.name, group: u.inGroup }) : undefined}
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
                          {u.name} <span className="text-xs text-muted-foreground">{t('picker.groupTag')}</span>
                        </span>
                        <span className="block truncate text-xs text-muted-foreground tabular-nums" title={u.detail}>
                          {u.detail}
                        </span>
                      </span>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 truncate">
                          {u.name}
                          {u.inGroup && <span className="text-xs text-muted-foreground"> {t('picker.aloneTag')}</span>}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{u.detail}</span>
                      </>
                    )}
                  </label>
                </li>
              ))}
            </ul>
            {chosen.length > 1 && (
              <p className="text-[11px] text-amber-800">{t('picker.several', { name })}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              {t('picker.help')}
            </p>
            {chosen.length > 0 && !draft && (
              <p className="text-[11px] text-muted-foreground">{t('picker.offKeeps')}</p>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
