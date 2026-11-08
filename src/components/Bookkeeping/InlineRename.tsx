import { useState, type ReactNode } from 'react'
import { Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * step2 (2026-11-08): rename right where the name is shown — the reports' accounts, a Bank
 * feeds folder, a payee on the Names tab — with no separate window. The pencil (always
 * visible on touch screens, on hover elsewhere) turns the name into a field: Enter or leaving
 * the field saves, Esc cancels. `onSave` throws to keep the field open with its message. The
 * name itself (`children`, else `value`) keeps its own click (open the ledger, fold a folder).
 */
export function InlineRename({
  value,
  onSave,
  label,
  children,
  className,
}: {
  value: string
  onSave: (next: string) => Promise<unknown>
  /** What is renamed, for the field and the pencil ("Rename account"). */
  label: string
  children?: ReactNode
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    const next = text.trim()
    if (busy) return
    if (!next || next === value) {
      setEditing(false)
      setError(null)
      return
    }
    setBusy(true)
    try {
      await onSave(next)
      setEditing(false)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not rename it')
    } finally {
      setBusy(false)
    }
  }

  if (editing)
    return (
      <span className={cn('flex min-w-0 flex-1 flex-col gap-0.5', className)} onClick={(e) => e.stopPropagation()}>
        <span className="flex items-center gap-1">
          <Input
            aria-label={label}
            value={text}
            autoFocus
            maxLength={191}
            disabled={busy}
            className="h-7 min-w-0 flex-1 text-sm"
            onChange={(e) => {
              setText(e.target.value)
              setError(null)
            }}
            onFocus={(e) => e.target.select()}
            onBlur={() => void save()}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') {
                e.preventDefault()
                void save()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                setEditing(false)
                setError(null)
              }
            }}
          />
          {busy && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
        </span>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </span>
    )

  return (
    <span className={cn('group/rename flex min-w-0 items-center gap-1', className)}>
      {children ?? <span className="truncate">{value}</span>}
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        title={label}
        aria-label={label}
        className="shrink-0 text-muted-foreground opacity-0 group-hover/rename:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setText(value)
          setError(null)
          setEditing(true)
        }}
      >
        <Pencil />
      </Button>
    </span>
  )
}
