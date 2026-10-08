import type { Period } from '@/api/bookkeeping'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/** Local calendar date → YYYY-MM-DD (never via toISOString, which shifts to UTC). */
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function presets(): Array<{ label: string; period: Period }> {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  return [
    { label: 'All time', period: { from: null, to: null } },
    { label: 'This month', period: { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) } },
    { label: 'Last month', period: { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) } },
    { label: 'This year', period: { from: `${y}-01-01`, to: `${y}-12-31` } },
    { label: 'Last year', period: { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` } },
  ]
}

/** From / to dates for the reports, with the usual presets. Both empty = all time. */
export function ReportPeriod({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const invalid = !!value.from && !!value.to && value.from > value.to
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5 lg:flex-row lg:items-end">
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-from" className="text-xs text-muted-foreground">
            From
          </Label>
          <Input
            id="report-from"
            type="date"
            value={value.from ?? ''}
            max={value.to ?? undefined}
            onChange={(e) => onChange({ ...value, from: e.target.value || null })}
            className="h-9 w-40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-to" className="text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id="report-to"
            type="date"
            value={value.to ?? ''}
            min={value.from ?? undefined}
            onChange={(e) => onChange({ ...value, to: e.target.value || null })}
            className="h-9 w-40"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets().map((p) => {
          const active = p.period.from === value.from && p.period.to === value.to
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.period)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                active
                  ? 'bg-[#0B1C2C] text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          )
        })}
      </div>
      {invalid && <p className="text-sm text-destructive lg:ml-auto">“From” must be before “To”.</p>}
    </div>
  )
}
