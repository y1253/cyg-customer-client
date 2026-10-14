import { Combobox } from '@base-ui/react/combobox'
import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { AccountType } from '@/api/bookkeeping'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useChartAccounts } from '@/hooks/useChartAccounts'
import { NEW_CATEGORY, TYPE_LABEL, type CategoryChoice } from '@/lib/categoryChoice'
import { cn } from '@/lib/utils'

/** The list item that turns what was typed into a new category. Never a real account name. */
const ADD = '\u0000add'

/**
 * The category picker: type to filter the fixed chart and the customer's own categories
 * (with their type); when nothing matches, "+ Add “…” as a new category" opens a name +
 * type to create it, the name already filled in.
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
  const creating = value.category === NEW_CATEGORY
  const [query, setQuery] = useState(creating ? value.newName : (value.category ?? ''))

  const ownType = useMemo(
    () => new Map((accounts.data ?? []).filter((a) => a.custom).map((a) => [a.name, a.type])),
    [accounts.data],
  )
  const names = useMemo(() => (accounts.data ?? []).map((a) => a.name), [accounts.data])
  const typed = query.trim()
  // The chosen category in the box shows the whole list again, not just itself.
  const q = typed === value.category ? '' : typed.toLowerCase()
  const exact = names.some((n) => n.toLowerCase() === typed.toLowerCase())
  const items = useMemo(() => {
    const shown = q ? names.filter((n) => n.toLowerCase().includes(q)) : names
    return typed && !exact ? [...shown, ADD] : shown
  }, [names, q, typed, exact])

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Combobox.Root<string>
        items={items}
        filter={null}
        value={creating ? ADD : value.category}
        inputValue={query}
        onInputValueChange={(v) => setQuery(v)}
        itemToStringLabel={(v) => (v === ADD ? typed : v)}
        onValueChange={(v) => {
          if (v === ADD) onChange({ ...value, category: NEW_CATEGORY, newName: typed })
          else if (v) onChange({ ...value, category: v })
        }}
        openOnInputClick
        autoHighlight
      >
        <div className="relative">
          <Combobox.Input
            placeholder="Type to find a category"
            maxLength={191}
            className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          />
          <Combobox.Trigger
            aria-label="Show every category"
            className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className="size-4" />
          </Combobox.Trigger>
        </div>
        <Combobox.Portal>
          <Combobox.Positioner sideOffset={4} className="isolate z-50">
            <Combobox.Popup className="max-h-64 w-(--anchor-width) min-w-48 overflow-y-auto rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10">
              <Combobox.Empty>
                <div className="px-2 py-1.5 text-xs text-muted-foreground">No categories yet — type one</div>
              </Combobox.Empty>
              <Combobox.List>
                {(name: string) => (
                  <Combobox.Item
                    key={name}
                    value={name}
                    className={cn(
                      'cursor-default truncate rounded-md px-2 py-1.5 outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground',
                      name === ADD && 'font-medium text-brand',
                    )}
                  >
                    {name === ADD ? (
                      <>+ Add “{typed}” as a new category</>
                    ) : (
                      <>
                        {name}
                        {ownType.has(name) && (
                          <span className="text-xs text-muted-foreground"> · {TYPE_LABEL[ownType.get(name)!]}</span>
                        )}
                      </>
                    )}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      {creating && (
        <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3 sm:flex-row">
          <Input
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
