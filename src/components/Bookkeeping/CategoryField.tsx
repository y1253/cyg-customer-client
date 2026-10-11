import type { AccountType } from '@/api/bookkeeping'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useChartAccounts } from '@/hooks/useChartAccounts'
import { NEW_CATEGORY, TYPE_LABEL, type CategoryChoice } from '@/lib/categoryChoice'
import { cn } from '@/lib/utils'

/**
 * The category picker: the fixed chart, the customer's own categories (with their type), and
 * "+ New category…", which opens a name + type to type one in.
 */
export function CategoryField({
  value,
  onChange,
  className,
}: {
  value: CategoryChoice
  onChange: (value: CategoryChoice) => void
  className?: string
}) {
  const accounts = useChartAccounts()
  const own = (accounts.data ?? []).filter((a) => a.custom)
  const chart = (accounts.data ?? []).filter((a) => !a.custom)
  const creating = value.category === NEW_CATEGORY

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Select value={value.category} onValueChange={(v) => onChange({ ...value, category: v })}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose a category">
            {(v: string | null) => (v === NEW_CATEGORY ? 'New category…' : v)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {chart.map((a) => (
            <SelectItem key={a.name} value={a.name}>
              {a.name}
            </SelectItem>
          ))}
          {own.length > 0 && <SelectSeparator />}
          {own.map((a) => (
            <SelectItem key={a.name} value={a.name}>
              {a.name} <span className="text-xs text-muted-foreground">· {TYPE_LABEL[a.type]}</span>
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={NEW_CATEGORY}>+ New category…</SelectItem>
        </SelectContent>
      </Select>
      {creating && (
        <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3 sm:flex-row">
          <Input
            autoFocus
            value={value.newName}
            maxLength={191}
            placeholder="Your category, e.g. Groceries"
            onChange={(e) => onChange({ ...value, newName: e.target.value })}
            className="sm:flex-1"
          />
          <Select
            value={value.newType}
            onValueChange={(v) => onChange({ ...value, newType: v as AccountType | null })}
          >
            <SelectTrigger className="sm:w-36">
              <SelectValue placeholder="Kind">{(v: AccountType | null) => (v ? TYPE_LABEL[v] : null)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TYPE_LABEL) as AccountType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
