import { useState } from 'react'
import { ChevronLeft, Percent } from 'lucide-react'
import type { LedgerTransaction, OneTimeSplitResult } from '@/api/bookkeeping'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useApplySplitRule } from '@/hooks/useSplits'
import { useTax } from '@/hooks/useTax'
import { cn } from '@/lib/utils'
import { pickerUnits, type Unit } from './split-rule-units'

/**
 * step12 (2026-11-22, user's request): a ONE-TIME split from a ledger row — pick a split group or rule (A–Z), then
 * "Only this row" or "All <name> rows" (the rows the name has now). Nothing is picked on the name, so later rows are
 * not cut. The pieces go under "<name> - <category> - <group or rule>", reused by every later one-time split by it.
 */
export function SplitRuleButton({ t }: { t: LedgerTransaction }) {
  const tax = useTax().data
  const apply = useApplySplitRule()
  const [open, setOpen] = useState(false)
  const [unit, setUnit] = useState<Unit | null>(null)
  const [done, setDone] = useState<OneTimeSplitResult | null>(null)
  if (!tax?.agencies.length) return null
  const units = pickerUnits(tax.agencies, (id) => tax.groups.find((g) => g.id === id)?.name)
  const name = t.name?.trim()

  const run = (scope: 'ONE' | 'NAME') => {
    if (!unit) return
    const which = unit.group ? { groupId: Number(unit.key.slice(1)) } : { agencyId: unit.ids[0] }
    apply.mutate({ id: t.id, scope, ...which }, { onSuccess: setDone })
  }
  const reset = () => {
    setUnit(null)
    setDone(null)
    apply.reset()
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <PopoverTrigger
        title="Split this transaction by a split rule or group — one time, no rule saved on the name"
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-brand opacity-0 ring-1 ring-brand/30 transition-opacity group-hover:opacity-100 hover:bg-brand/10 focus-visible:opacity-100 data-popup-open:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <Percent className="size-3.5" />
        Split rule
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        {done ? (
          <div className="grid gap-2 text-sm">
            <p>
              {done.split
                ? `Split ${done.split} transaction${done.split === 1 ? '' : 's'} by ${unit?.name}.`
                : `Nothing to split — ${unit?.name} already split ${done.skipped === 1 ? 'it' : 'them'}.`}
              {done.split > 0 && done.skipped > 0 && ` ${done.skipped} already split.`}
            </p>
            <div className="flex justify-end">
              <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : unit ? (
          <div className="grid gap-2 text-sm">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 justify-self-start text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-3.5" />
              {unit.name}
            </button>
            <p className="text-xs text-muted-foreground">
              One time — {name ?? 'the name'} keeps no split rule, so new transactions are not split.
            </p>
            <Button
              type="button"
              size="sm"
              disabled={apply.isPending}
              className="justify-start bg-brand text-white hover:bg-brand/85"
              onClick={() => run('ONE')}
            >
              Only this row
            </Button>
            {name && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={apply.isPending}
                className="justify-start"
                onClick={() => run('NAME')}
              >
                All {name} rows (the ones there now)
              </Button>
            )}
            {apply.error && <p className="text-xs text-destructive">{apply.error.message}</p>}
          </div>
        ) : (
          <>
            <p className="text-xs font-medium text-muted-foreground">Split by</p>
            <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
              {units.map((u) => (
                <li key={u.key} className={cn(u.inGroup && 'pl-4')}>
                  <button
                    type="button"
                    disabled={!u.active}
                    onClick={() => setUnit(u)}
                    title={!u.active ? `${u.name} is switched off` : u.detail}
                    className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {u.name}
                      {u.group && <span className="text-xs text-muted-foreground"> (group)</span>}
                      {u.inGroup && <span className="text-xs text-muted-foreground"> alone</span>}
                    </span>
                    {!u.group && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{u.detail}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
