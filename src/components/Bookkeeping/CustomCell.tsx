import { useState } from 'react'
import type { CustomAnswer, CustomColumn, NameAnswerTarget } from '@/api/customColumns'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSaveCustomAnswer, useSaveNameAnswer } from '@/hooks/useCustomColumns'
import { answerProblem, rulesText, typedValue } from '@/lib/custom-columns'
import { sortByLabel } from '@/lib/sort'
import { cn } from '@/lib/utils'

const NONE = '__none__'

/**
 * step8 (2026-11-11): one cell of a column the customer made. A DROPDOWN is a select of its
 * options (+ "—" to clear); the others show the answer and turn into an input on click. The
 * column's rules are enforced HERE before anything is sent (user's request): a number cell
 * takes no letters, a text-only cell no digits, nothing past the max (`typedValue`), and a
 * too-short / malformed answer is named under the input and not saved (`answerProblem`). The
 * server checks again; its refusal shows the same way.
 *
 * step9 (2026-11-19): with `nameTarget` it edits a name's / sub-name's DEFAULT answer instead of one transaction's
 * (the same rules; `emptyLabel` for an empty one).
 */
export function CustomCell({
  column,
  answer,
  transactionId,
  nameTarget,
  emptyLabel,
}: {
  column: CustomColumn
  answer: CustomAnswer | undefined
  transactionId?: number
  nameTarget?: NameAnswerTarget
  emptyLabel?: string
}) {
  const saveRow = useSaveCustomAnswer()
  const saveName = useSaveNameAnswer()
  const active = nameTarget ? saveName : saveRow
  const save = {
    isPending: active.isPending,
    error: active.error,
    reset: active.reset,
    mutate: (
      v: { value?: string | null; dropDownId?: number | null },
      opts?: { onSuccess?: () => void },
    ) =>
      nameTarget
        ? saveName.mutate({ ...nameTarget, columnId: column.id, ...v }, opts)
        : saveRow.mutate({ transactionId: transactionId!, columnId: column.id, ...v }, opts),
  }
  const empty = emptyLabel ?? (column.required ? 'Required' : '—')
  const [draft, setDraft] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const serverError = save.error?.message ?? null

  if (column.type === 'DROPDOWN') {
    const value = answer?.dropDownId != null && column.options.some((o) => o.id === answer.dropDownId)
      ? String(answer.dropDownId)
      : null
    const label = (v: string | null) =>
      column.options.find((o) => String(o.id) === v)?.label ?? empty
    return (
      <span className="flex min-w-0 flex-col gap-0.5">
        <Select
          value={value}
          onValueChange={(v) => save.mutate({ dropDownId: !v || v === NONE ? null : Number(v) })}
        >
          <SelectTrigger
            size="sm"
            className={cn(
              'h-7 w-full min-w-0 text-xs',
              !value && (column.required && !nameTarget ? 'text-amber-700' : 'text-muted-foreground'),
            )}
            title={rulesText(column)}
          >
            <SelectValue>{(v: string | null) => label(v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {sortByLabel(column.options, (o) => o.label).map((o) => (
              <SelectItem key={o.id} value={String(o.id)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {serverError && <span className="text-[11px] text-destructive">{serverError}</span>}
      </span>
    )
  }

  const stored = answer?.value ?? ''
  const commit = () => {
    if (draft === null) return
    const why = answerProblem(column, draft)
    if (why) {
      setProblem(why)
      return
    }
    setProblem(null)
    if (draft.trim() !== stored) {
      save.mutate({ value: draft.trim() || null }, { onSuccess: () => setDraft(null) })
    } else {
      setDraft(null)
    }
  }

  if (draft === null) {
    const bad = stored ? answerProblem(column, stored) : null
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(stored)
          setProblem(null)
          save.reset()
        }}
        title={bad ? `${bad} — click to fix` : `${rulesText(column)} — click to edit`}
        className={cn(
          'block w-full min-w-0 truncate rounded px-1 py-0.5 text-left text-sm hover:bg-black/5',
          !stored && 'text-muted-foreground/60',
          !stored && column.required && !nameTarget && 'text-amber-700',
          bad && 'text-destructive underline decoration-dotted',
        )}
      >
        {stored || empty}
      </button>
    )
  }

  const shown = problem ?? serverError
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <Input
        autoFocus
        value={draft}
        inputMode={column.type === 'NUMBER' ? 'decimal' : undefined}
        maxLength={column.maxChars ?? undefined}
        onChange={(e) => {
          setDraft(typedValue(column, e.target.value))
          setProblem(null)
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            // Inside a name's Edit form, Enter saves this answer — not the form.
            e.preventDefault()
            commit()
          }
          if (e.key === 'Escape') {
            setDraft(null)
            setProblem(null)
          }
        }}
        disabled={save.isPending}
        aria-invalid={!!shown}
        className="h-7 min-w-0 px-1.5 text-sm"
      />
      <span className={cn('text-[11px] leading-tight', shown ? 'text-destructive' : 'text-muted-foreground')}>
        {shown ?? rulesText(column)}
        {!shown && column.maxChars !== null && ` · ${draft.trim().length}/${column.maxChars}`}
      </span>
    </span>
  )
}
