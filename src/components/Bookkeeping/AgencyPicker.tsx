import { Landmark } from 'lucide-react'
import { TAX_KIND_LABEL, type NameType, type TaxAgency } from '@/api/bookkeeping'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

const pct = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 3 })}%`

/**
 * The agencies that tax one name: a chip with what is picked ("No tax" by default), opening
 * a list with a switch per agency. A Customer name pays each agency's sales rate, a Supplier
 * its purchase rate — an agency with no rate of that kind is shown but cannot tax it.
 */
export function AgencyPicker({
  name,
  type,
  agencies,
  picked,
  pending,
  onChange,
}: {
  name: string
  type: NameType
  agencies: TaxAgency[]
  picked: number[]
  pending: boolean
  onChange: (agencyIds: number[]) => void
}) {
  const kind = type === 'CUSTOMER' ? 'SALES' : type === 'SUPPLIER' ? 'PURCHASE' : null
  const chosen = agencies.filter((a) => picked.includes(a.id))
  return (
    <Popover>
      <PopoverTrigger
        disabled={pending}
        title={`Which taxes apply to ${name}`}
        className={cn(
          'inline-flex max-w-44 shrink-0 items-center gap-1 truncate rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors',
          chosen.length
            ? 'bg-amber-50 text-amber-800 ring-amber-600/20 hover:bg-amber-100'
            : 'text-muted-foreground ring-black/10 hover:bg-muted',
        )}
      >
        <Landmark className="size-3.5 shrink-0" />
        <span className="truncate">{chosen.length ? chosen.map((a) => a.name).join(', ') : 'No tax'}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <p className="text-xs font-medium text-muted-foreground">Taxes on {name}</p>
        <ul className="flex flex-col gap-1">
          {agencies.map((a) => {
            const rate = kind ? a.rates.find((r) => r.kind === kind) : a.rates[0]
            const on = picked.includes(a.id)
            return (
              <li key={a.id}>
                <label className={cn('flex items-center gap-2.5 rounded-md px-1.5 py-1 text-sm', !a.active && 'opacity-60')}>
                  <Switch
                    checked={on}
                    disabled={pending}
                    onCheckedChange={(v) => onChange(v ? [...picked, a.id] : picked.filter((id) => id !== a.id))}
                    className="data-checked:bg-brand"
                  />
                  <span className="min-w-0 flex-1 truncate">{a.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {rate ? `${TAX_KIND_LABEL[rate.kind]} ${pct(rate.rate)}` : kind ? `no ${TAX_KIND_LABEL[kind].toLowerCase()} rate` : ''}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
