import { Autocomplete } from '@base-ui/react/autocomplete'
import { useMemo } from 'react'
import { useNames } from '@/hooks/useNames'
import { cn } from '@/lib/utils'

/**
 * A name field that offers every name on the Names tab as the customer types — pick one, or
 * keep typing to create a new one ("+ Create “…”"). The value is always the typed text.
 */
export function NamePicker({
  id,
  value,
  onChange,
  placeholder,
  autoFocus,
  className,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
}) {
  const names = useNames()
  const items = useMemo(
    () => [...new Set((names.data?.names ?? []).map((n) => n.name))].sort((a, b) => a.localeCompare(b)),
    [names.data],
  )
  const typed = value.trim()
  const isNew = typed !== '' && !items.some((n) => n.toLowerCase() === typed.toLowerCase())

  return (
    <Autocomplete.Root items={items} value={value} onValueChange={(v) => onChange(v)} openOnInputClick>
      <Autocomplete.Input
        id={id}
        maxLength={191}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={cn(
          'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm',
          className,
        )}
      />
      <Autocomplete.Portal>
        <Autocomplete.Positioner sideOffset={4} className="isolate z-50">
          <Autocomplete.Popup className="max-h-64 w-(--anchor-width) min-w-48 overflow-y-auto rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10">
            {isNew && (
              <div className="px-2 py-1.5 text-xs font-medium text-brand">+ Create “{typed}” as a new name</div>
            )}
            <Autocomplete.Empty>
              {!isNew && <div className="px-2 py-1.5 text-xs text-muted-foreground">No names yet — type one</div>}
            </Autocomplete.Empty>
            <Autocomplete.List>
              {(name: string) => (
                <Autocomplete.Item
                  key={name}
                  value={name}
                  className="cursor-default truncate rounded-md px-2 py-1.5 outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  {name}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  )
}
