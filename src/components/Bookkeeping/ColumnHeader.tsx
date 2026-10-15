import { ArrowDown, ArrowUp, ArrowUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TableHead } from '@/components/ui/table'
import { isActive, type ColumnFilter, type ColumnKind, type SortDir, type TableControls } from '@/lib/table-sort'
import { cn } from '@/lib/utils'

const SORT_LABELS: Record<ColumnKind, Record<SortDir, string>> = {
  text: { asc: 'A → Z', desc: 'Z → A' },
  number: { asc: 'Smallest first', desc: 'Largest first' },
  date: { asc: 'Oldest first', desc: 'Newest first' },
}

/**
 * A table header that sorts and filters its own column: click it for a small panel with
 * the two sort orders and the column's filter (text contains / a range). An arrow shows the
 * active sort, a dot an active filter. Each column filters on its own; they combine.
 */
export function ColumnHeader({
  column,
  label,
  kind,
  controls,
  className,
  align = 'start',
}: {
  column: string
  label: string
  kind: ColumnKind
  controls: TableControls
  className?: string
  align?: 'start' | 'end'
}) {
  const { sort, setSort, filters, setFilter } = controls
  const f: ColumnFilter = filters[column] ?? {}
  const sorted = sort?.key === column ? sort.dir : null
  const filtered = isActive(f)
  const SortIcon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown
  const num = (v: string) => (v.trim() === '' || Number.isNaN(Number(v)) ? null : Number(v))

  return (
    <TableHead className={className}>
      <Popover>
        <PopoverTrigger
          className={cn(
            'inline-flex max-w-full items-center gap-1 rounded px-1 py-0.5 -mx-1 font-medium hover:bg-black/5 hover:text-foreground',
            align === 'end' && 'flex-row-reverse',
            (sorted || filtered) && 'text-brand',
          )}
          title={`Sort or filter by ${label.toLowerCase()}`}
        >
          <span className="truncate">{label}</span>
          <SortIcon className={cn('size-3.5 shrink-0', !sorted && 'opacity-40')} />
          {filtered && <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-label="filtered" />}
        </PopoverTrigger>
        <PopoverContent align={align} className="w-64 font-normal">
          <div className="flex gap-1.5">
            {(['asc', 'desc'] as const).map((dir) => (
              <Button
                key={dir}
                size="sm"
                variant={sorted === dir ? 'default' : 'outline'}
                className={cn('h-8 flex-1', sorted === dir && 'bg-brand text-white hover:bg-brand/85')}
                onClick={() => setSort(sorted === dir ? null : { key: column, dir })}
              >
                {SORT_LABELS[kind][dir]}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Filter {label.toLowerCase()}</Label>
            {kind === 'text' && (
              <Input
                autoFocus
                value={f.text ?? ''}
                onChange={(e) => setFilter(column, { text: e.target.value })}
                placeholder="Contains…"
                className="h-8"
              />
            )}
            {kind === 'number' && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={f.min ?? ''}
                  onChange={(e) => setFilter(column, { ...f, min: num(e.target.value) })}
                  placeholder="Min"
                  className="h-8"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={f.max ?? ''}
                  onChange={(e) => setFilter(column, { ...f, max: num(e.target.value) })}
                  placeholder="Max"
                  className="h-8"
                />
              </div>
            )}
            {kind === 'date' && (
              <div className="flex flex-col gap-1.5">
                <Input
                  type="date"
                  value={f.from ?? ''}
                  onChange={(e) => setFilter(column, { ...f, from: e.target.value || null })}
                  className="h-8"
                  aria-label="From"
                />
                <Input
                  type="date"
                  value={f.to ?? ''}
                  onChange={(e) => setFilter(column, { ...f, to: e.target.value || null })}
                  className="h-8"
                  aria-label="To"
                />
              </div>
            )}
          </div>
          {(filtered || sorted) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 self-start text-muted-foreground"
              onClick={() => {
                setFilter(column, null)
                if (sorted) setSort(null)
              }}
            >
              <X className="size-3.5" /> Clear
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </TableHead>
  )
}
