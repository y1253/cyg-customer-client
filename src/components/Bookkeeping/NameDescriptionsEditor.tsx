import { useState } from 'react'
import { Check, ListFilter, Pencil, Plus, Trash2, X } from 'lucide-react'
import { CONTAINS_MIN, type NameDescription } from '@/api/bookkeeping'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSetNameGroup } from '@/hooks/useNameGroups'
import { useResetNameRule, useSaveNameRule } from '@/hooks/useNameRule'
import { useNames } from '@/hooks/useNames'

/**
 * step9: inside a name's Edit dialog — the bank descriptions this name follows, and its
 * group. Each description shows the rule that ties it here (an exact description, or
 * "contains …"); the customer can NARROW one to a few of its words (a contains rule for this
 * name, which then also catches the variants), change or remove a contains rule, or add one.
 * Every change is saved at once (the Save button below is for the name and category).
 * Reads the name live, so the list follows each change.
 */
export function NameDescriptionsEditor({ name }: { name: string }) {
  const names = useNames()
  const live = names.data?.names.find((n) => n.name.toLowerCase() === name.toLowerCase())
  const save = useSaveNameRule()
  const reset = useResetNameRule()
  const setGroup = useSetNameGroup()
  const [narrowing, setNarrowing] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [adding, setAdding] = useState(false)
  if (!live) return null
  const busy = save.isPending || reset.isPending
  const error = save.error ?? reset.error ?? setGroup.error

  /** Save `value` as this name's contains rule — replacing `replace` (an exact or older contains rule). */
  const saveContains = async (value: string, replace?: { matchType: 'DESCRIPTION' | 'CONTAINS'; matchKey: string }) => {
    const trimmed = value.trim()
    if (trimmed.length < CONTAINS_MIN) return
    // An exact description rule wins over a contains rule, so it goes first.
    if (replace && !(replace.matchType === 'CONTAINS' && replace.matchKey === trimmed.toLowerCase()))
      await reset.mutateAsync(replace)
    await save.mutateAsync({ matchType: 'CONTAINS', matchKey: trimmed, name: live.name, category: null, scope: 'ALWAYS' })
    setNarrowing(null)
    setAdding(false)
    setText('')
  }

  const startNarrow = (id: string, value: string) => {
    setAdding(false)
    setNarrowing(id)
    setText(value)
  }

  const editor = (onSave: () => void) => (
    <div className="mt-1 flex flex-col gap-1">
      <div className="flex gap-1.5">
        <Input
          aria-label="Description contains"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={191}
          autoFocus
          className="h-8"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSave()
            }
          }}
        />
        <Button type="button" size="icon-sm" disabled={busy || text.trim().length < CONTAINS_MIN} onClick={onSave} title="Save">
          <Check />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          title="Cancel"
          onClick={() => {
            setNarrowing(null)
            setAdding(false)
          }}
        >
          <X />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Keep only the words every description of {live.name} has (at least {CONTAINS_MIN} characters). Every
        description containing them gets this name — now and in every later statement.
      </p>
    </div>
  )

  const groups = names.data?.groups ?? []
  return (
    <div className="flex flex-col gap-3">
      {groups.length > 0 && !live.unclarified && (
        <div className="flex flex-col gap-1.5">
          <Label>Group</Label>
          <Select
            value={live.group ?? live.type}
            onValueChange={(v) => v && v !== live.group && setGroup.mutate({ name: live.name, group: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{(v: string | null) => groups.find((g) => g.key === v)?.label ?? v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.key} value={g.key}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Where it is listed on the Names tab — its categories and tax stay as they are.</p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label>Descriptions this name follows</Label>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              setNarrowing(null)
              setAdding(true)
              setText('')
            }}
          >
            <Plus className="size-3.5" /> Add
          </Button>
        </div>
        <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto rounded-lg bg-muted/40 p-2 text-sm">
          {(live.followsContains ?? []).map((c) => (
            <li key={`c:${c.key}`} className="px-1 py-0.5">
              <div className="flex items-center gap-2">
                <ListFilter className="size-3.5 shrink-0 text-brand" />
                <span className="min-w-0 flex-1 truncate">
                  Contains “<span className="font-medium">{c.text}</span>”
                </span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{c.rows} rows</span>
                <Button type="button" variant="ghost" size="icon-xs" title="Change the words" onClick={() => startNarrow(`c:${c.key}`, c.text)}>
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="Remove this rule"
                  disabled={busy}
                  onClick={() => reset.mutate({ matchType: 'CONTAINS', matchKey: c.key })}
                >
                  <Trash2 />
                </Button>
              </div>
              {narrowing === `c:${c.key}` && editor(() => void saveContains(text, { matchType: 'CONTAINS', matchKey: c.key }))}
            </li>
          ))}
          {live.descriptions.map((d: NameDescription) => {
            const id = `d:${d.key ?? d.description}`
            return (
              <li key={id} className="px-1 py-0.5">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate" title={d.description}>
                    {d.description}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {d.rule?.matchType === 'DESCRIPTION'
                      ? 'this description'
                      : d.rule?.matchType === 'CONTAINS'
                        ? `contains “${d.rule.text}”`
                        : 'read by the AI'}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    title="Narrow it to a few words"
                    onClick={() => startNarrow(id, d.description)}
                  >
                    <Pencil />
                  </Button>
                  {d.rule?.matchType === 'DESCRIPTION' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      title="Stop following it (its rows go back to the default)"
                      disabled={busy}
                      onClick={() => reset.mutate({ matchType: 'DESCRIPTION', matchKey: d.rule!.matchKey })}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
                {narrowing === id &&
                  editor(() =>
                    void saveContains(
                      text,
                      d.rule?.matchType === 'DESCRIPTION' ? { matchType: 'DESCRIPTION', matchKey: d.rule.matchKey } : undefined,
                    ),
                  )}
              </li>
            )
          })}
          {!live.descriptions.length && !(live.followsContains ?? []).length && (
            <li className="px-1 py-0.5 text-muted-foreground">No descriptions yet.</li>
          )}
        </ul>
        {adding && editor(() => void saveContains(text))}
        <p className="text-xs text-muted-foreground">
          Drag a description from one name to another on the Names tab to move it there.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  )
}
