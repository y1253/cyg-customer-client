import { useState } from 'react'
import { Split } from 'lucide-react'
import { rateLabel, type TaxAgency } from '@/api/bookkeeping'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

/**
 * step9 part 4 (2026-11-15): the SPLIT RULES of one name (were tax agencies): a chip with what is picked ("No
 * split rules" by default), opening a list with a switch per rule. Picking a rule is a one-time command — it
 * splits the name's existing transactions now (asked first), and new ones as they come in. Turning one off
 * leaves the splits it made. `rows` = how many transactions the name has (for the question); `draft` = a name
 * not saved yet: picks are only held, nothing is asked.
 */
export function AgencyPicker({
  name,
  agencies,
  picked,
  pending,
  onChange,
  rows,
  draft,
}: {
  name: string
  agencies: TaxAgency[]
  picked: number[]
  pending: boolean
  onChange: (agencyIds: number[]) => void
  rows?: number
  draft?: boolean
}) {
  const chosen = agencies.filter((a) => picked.includes(a.id))
  /** A rule switched on, waiting for "Split them". */
  const [asking, setAsking] = useState<TaxAgency | null>(null)
  const turn = (a: TaxAgency, on: boolean) => {
    if (!on) return onChange(picked.filter((id) => id !== a.id))
    if (draft || rows === 0) return onChange([...picked, a.id])
    setAsking(a)
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
        <span className="truncate">{chosen.length ? chosen.map((a) => a.name).join(', ') : 'No split rules'}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="text-xs font-medium text-muted-foreground">Split rules of {name}</p>
        {asking ? (
          <div className="grid gap-2 rounded-md bg-muted/50 p-2 text-sm">
            <p>
              Split {rows !== undefined ? `the ${rows} transaction${rows === 1 ? '' : 's'}` : 'the transactions'} of{' '}
              <span className="font-medium">{name}</span> by <span className="font-medium">{asking.name}</span> now?
            </p>
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
                  onChange([...picked, asking.id])
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
              {agencies.map((a) => (
                <li key={a.id}>
                  <label className={cn('flex items-center gap-2.5 rounded-md px-1.5 py-1 text-sm', !a.active && 'opacity-60')}>
                    <Switch
                      checked={picked.includes(a.id)}
                      disabled={pending}
                      onCheckedChange={(v) => turn(a, v)}
                      className="data-checked:bg-brand"
                    />
                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {a.rates.map(rateLabel).join(' · ')}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {chosen.length > 0 && !draft && (
              <p className="text-[11px] text-muted-foreground">Turning one off keeps the splits it already made.</p>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
