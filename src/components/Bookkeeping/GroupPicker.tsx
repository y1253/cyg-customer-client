import { Combobox } from '@base-ui/react/combobox'
import { Check, ChevronDown, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { NameGroup } from '@/api/bookkeeping'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSaveNameGroup } from '@/hooks/useNameGroups'
import { cn } from '@/lib/utils'

/** The list item that turns what was typed into a new group. Never a real group key. */
const ADD = '\u0000add'

/**
 * step2 (2026-11-09): a name's Names-tab group — type to find one, or make a new one right
 * here: "+ Add “Employees” as a new group" when nothing matches, or the + button beside the
 * box. A new group is created at once and picked.
 */
export function GroupPicker({
  groups,
  value,
  onChange,
  disabled,
}: {
  groups: NameGroup[]
  value: string | null
  onChange: (key: string) => void
  disabled?: boolean
}) {
  const saveGroup = useSaveNameGroup()
  const labelOf = (key: string | null) => groups.find((g) => g.key === key)?.label ?? ''
  const [query, setQuery] = useState(labelOf(value))
  const [shown, setShown] = useState(value)
  if (value !== shown) {
    setShown(value)
    setQuery(labelOf(value))
  }
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  const typed = query.trim()
  // The chosen group in the box shows the whole list again, not just itself.
  const q = typed === labelOf(value) ? '' : typed.toLowerCase()
  const exact = groups.some((g) => g.label.toLowerCase() === typed.toLowerCase())
  const items = useMemo(() => {
    const keys = groups.filter((g) => !q || g.label.toLowerCase().includes(q)).map((g) => g.key)
    return typed && !exact ? [...keys, ADD] : keys
  }, [groups, q, typed, exact])

  const create = async (raw: string) => {
    const name = raw.trim()
    if (!name) return
    const found = groups.find((g) => g.label.toLowerCase() === name.toLowerCase())
    if (found) {
      onChange(found.key)
    } else {
      const data = await saveGroup.mutateAsync({ name }).catch(() => null)
      const made = data?.groups?.find((g) => g.label.toLowerCase() === name.toLowerCase())
      if (!made) return
      onChange(made.key)
    }
    setAdding(false)
    setNewName('')
  }

  if (adding) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex gap-1.5">
          <Input
            autoFocus
            maxLength={64}
            value={newName}
            placeholder="New group, e.g. Employees"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void create(newName)
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                setAdding(false)
              }
            }}
            className="h-8"
          />
          <Button
            type="button"
            size="icon-sm"
            title="Add this group"
            disabled={saveGroup.isPending || !newName.trim()}
            onClick={() => void create(newName)}
          >
            <Check />
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" title="Cancel" onClick={() => setAdding(false)}>
            <X />
          </Button>
        </div>
        {saveGroup.error && <p className="text-xs text-destructive">{saveGroup.error.message}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1.5">
        <Combobox.Root<string>
          items={items}
          filter={null}
          value={value}
          inputValue={query}
          onInputValueChange={(v) => setQuery(v)}
          itemToStringLabel={(v) => (v === ADD ? typed : labelOf(v))}
          onValueChange={(v) => {
            if (v === ADD) void create(typed)
            else if (v) onChange(v)
          }}
          disabled={disabled || saveGroup.isPending}
          openOnInputClick
          autoHighlight
        >
          <div className="relative min-w-0 flex-1">
            <Combobox.Input
              placeholder="Type to find or add a group"
              maxLength={64}
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 md:text-sm"
            />
            <Combobox.Trigger
              aria-label="Show every group"
              className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className="size-4" />
            </Combobox.Trigger>
          </div>
          <Combobox.Portal>
            <Combobox.Positioner sideOffset={4} className="isolate z-50">
              <Combobox.Popup className="max-h-64 w-(--anchor-width) min-w-48 overflow-y-auto rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10">
                <Combobox.List>
                  {(key: string) => (
                    <Combobox.Item
                      key={key}
                      value={key}
                      className={cn(
                        'flex cursor-default items-center gap-2 truncate rounded-md px-2 py-1.5 outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground',
                        key === ADD && 'font-medium text-brand',
                      )}
                    >
                      {key === ADD ? (
                        <>+ Add “{typed}” as a new group</>
                      ) : (
                        <>
                          <span className="min-w-0 flex-1 truncate">{labelOf(key)}</span>
                          {key === value && <Check className="size-4 shrink-0" />}
                        </>
                      )}
                    </Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          title="Make a new group"
          disabled={disabled}
          onClick={() => {
            setNewName('')
            setAdding(true)
          }}
        >
          <Plus />
        </Button>
      </div>
      {saveGroup.error && <p className="text-xs text-destructive">{saveGroup.error.message}</p>}
    </div>
  )
}
