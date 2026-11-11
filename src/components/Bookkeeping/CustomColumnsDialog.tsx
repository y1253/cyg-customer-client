import { useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { CustomColumn, CustomColumnInput } from '@/api/customColumns'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  useCopyCustomColumns,
  useCustomColumns,
  useDeleteCustomColumn,
  useSaveCustomColumn,
} from '@/hooks/useCustomColumns'
import { CUSTOM_COLUMN_TYPES, rulesText, TYPE_LABELS, type CustomColumnType } from '@/lib/custom-columns'

type Draft = Omit<CustomColumnInput, 'minChars' | 'maxChars'> & {
  id?: number
  minChars: string
  maxChars: string
}

const EMPTY: Draft = { name: '', type: 'TEXT', minChars: '', maxChars: '', required: false, options: [] }

const draftOf = (c: CustomColumn): Draft => ({
  id: c.id,
  name: c.name,
  type: c.type,
  minChars: c.minChars?.toString() ?? '',
  maxChars: c.maxChars?.toString() ?? '',
  required: c.required,
  options: c.options.map((o) => ({ id: o.id, label: o.label })),
})

/** The form's own check, before anything is sent (the server's `cleanColumn` says the same). */
function draftProblem(d: Draft): string | null {
  if (!d.name.trim()) return 'Give the column a name'
  const min = d.minChars === '' ? null : Number(d.minChars)
  const max = d.maxChars === '' ? null : Number(d.maxChars)
  if (d.type !== 'DROPDOWN') {
    for (const v of [min, max]) {
      if (v !== null && (!Number.isInteger(v) || v < 0 || v > 1000)) return 'Characters: a whole number from 0 to 1000'
    }
    if (min !== null && max !== null && min > max) return 'The minimum is more than the maximum'
  } else {
    const labels = d.options.map((o) => o.label.trim().toLowerCase()).filter(Boolean)
    if (!labels.length) return 'Add at least one option'
    if (new Set(labels).size !== labels.length) return 'An option is in the list twice'
  }
  return null
}

/**
 * step8 (2026-11-11): the customer's own ledger columns for this company ("Business" with
 * 1 / 2 / 3). Add, edit, remove; a column's type and rules (any text, text only, number only,
 * a dropdown list; min / max characters; required). When their other companies have columns,
 * "Same as <company>" copies them (user's request).
 */
export function CustomColumnsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data } = useCustomColumns()
  const save = useSaveCustomColumn()
  const remove = useDeleteCustomColumn()
  const copy = useCopyCustomColumns()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [tried, setTried] = useState(false)
  const columns = data?.columns ?? []
  const templates = data?.templates ?? []
  const problem = draft ? draftProblem(draft) : null

  const submit = () => {
    if (!draft) return
    setTried(true)
    if (problem) return
    save.mutate(
      {
        ...draft,
        name: draft.name.trim(),
        minChars: draft.type === 'DROPDOWN' || draft.minChars === '' ? null : Number(draft.minChars),
        maxChars: draft.type === 'DROPDOWN' || draft.maxChars === '' ? null : Number(draft.maxChars),
        options: draft.type === 'DROPDOWN' ? draft.options.filter((o) => o.label.trim()) : [],
      },
      {
        onSuccess: () => {
          setDraft(null)
          setTried(false)
        },
      },
    )
  }

  const setOption = (i: number, label: string) =>
    setDraft((d) => d && { ...d, options: d.options.map((o, k) => (k === i ? { ...o, label } : o)) })
  const moveOption = (i: number, by: number) =>
    setDraft((d) => {
      if (!d) return d
      const next = [...d.options]
      const j = i + by
      if (j < 0 || j >= next.length) return d
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...d, options: next }
    })

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) {
          setDraft(null)
          setTried(false)
        }
      }}
    >
      <DialogContent className="overflow-x-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Your columns</DialogTitle>
          <DialogDescription>
            Add your own columns to this company's ledger — for example “Business” with 1, 2 or 3 — and fill them in on
            each transaction. They are in your downloads too.
          </DialogDescription>
        </DialogHeader>

        {!draft && (
          <div className="flex min-w-0 flex-col gap-3">
            {columns.length === 0 && <p className="text-sm text-muted-foreground">No columns of your own yet.</p>}
            {columns.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#0B1C2C]">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {rulesText(c)}
                    {c.type === 'DROPDOWN' && `: ${c.options.map((o) => o.label).join(', ')}`}
                    {c.required && ' · required'}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setDraft(draftOf(c))} title="Edit">
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(c.id)}
                  title="Remove the column (and its answers)"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button className="gap-1.5 bg-brand text-white hover:bg-brand/85" onClick={() => setDraft({ ...EMPTY })}>
                <Plus className="size-4" /> Add a column
              </Button>
              {templates.map((t) => (
                <Button
                  key={t.bookId}
                  variant="outline"
                  className="gap-1.5"
                  disabled={copy.isPending}
                  onClick={() => copy.mutate(t.bookId)}
                  title={`Copy: ${t.columns.map((c) => c.name).join(', ')}`}
                >
                  <Copy className="size-4" /> Same as {t.bookName}
                </Button>
              ))}
            </div>
            {templates.length > 0 && (
              <p className="text-xs text-muted-foreground">
                “Same as …” copies that company's columns and their options (not the answers). Columns with a name you
                already have are skipped.
              </p>
            )}
            {(remove.error || copy.error) && (
              <p className="text-sm text-destructive">{(remove.error ?? copy.error)?.message}</p>
            )}
          </div>
        )}

        {draft && (
          <form
            className="flex min-w-0 flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cc-name">Column name</Label>
              <Input
                id="cc-name"
                autoFocus
                maxLength={64}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Business"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>What it holds</Label>
              <Select
                value={draft.type}
                onValueChange={(v) =>
                  v &&
                  setDraft({
                    ...draft,
                    type: v as CustomColumnType,
                    options: v === 'DROPDOWN' && !draft.options.length ? [{ label: '' }] : draft.options,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: CustomColumnType) => TYPE_LABELS[v]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_COLUMN_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {draft.type === 'DROPDOWN' ? (
              <div className="flex flex-col gap-1.5">
                <Label>Options</Label>
                {draft.options.map((o, i) => (
                  <div key={o.id ?? `n${i}`} className="flex items-center gap-1">
                    <Input
                      value={o.label}
                      maxLength={120}
                      onChange={(e) => setOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className="h-9"
                    />
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => moveOption(i, -1)} title="Up">
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => moveOption(i, 1)} title="Down">
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDraft({ ...draft, options: draft.options.filter((_, k) => k !== i) })}
                      title="Remove the option"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit gap-1.5"
                  onClick={() => setDraft({ ...draft, options: [...draft.options, { label: '' }] })}
                >
                  <Plus className="size-4" /> Add an option
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cc-min">Min characters</Label>
                  <Input
                    id="cc-min"
                    inputMode="numeric"
                    value={draft.minChars}
                    onChange={(e) => setDraft({ ...draft, minChars: e.target.value.replace(/\D/g, '') })}
                    placeholder="None"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cc-max">Max characters</Label>
                  <Input
                    id="cc-max"
                    inputMode="numeric"
                    value={draft.maxChars}
                    onChange={(e) => setDraft({ ...draft, maxChars: e.target.value.replace(/\D/g, '') })}
                    placeholder="None"
                  />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <Label htmlFor="cc-required">Required</Label>
                <span className="text-xs text-muted-foreground">Empty cells are marked so you can fill them in.</span>
              </div>
              <Switch
                id="cc-required"
                checked={draft.required}
                onCheckedChange={(v) => setDraft({ ...draft, required: v })}
              />
            </div>
            {((tried && problem) || save.error) && (
              <p className="text-sm text-destructive">{(tried && problem) || save.error?.message}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending} className="bg-brand text-white hover:bg-brand/85">
                {draft.id ? 'Save' : 'Add column'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
