import { useState } from 'react'
import { CornerDownRight, X } from 'lucide-react'
import type { SubName } from '@/api/bookkeeping'
import { Button } from '@/components/ui/button'
import { useCreateAccount } from '@/hooks/useCreateAccount'
import { useDeleteSubName, useSetSubNameCategory } from '@/hooks/useSplits'
import { categoryChoice, choiceReady, resolveChoice } from '@/lib/categoryChoice'
import { money } from '@/lib/money'
import { cn } from '@/lib/utils'
import { CategoryField } from './CategoryField'

/**
 * step2 (2026-11-15): one sub-name under its name on the Names tab ("Walmart - Maintenance"):
 * splits put in another category "only for this". Its category can be changed (every row of
 * it moves) and it can be removed (its rows go back to the name's category). Its rows are
 * still the name's — they count in the name's totals.
 * step9 (2026-11-15): with its total; a tax sub-name ("Walmart - GST", the name's tax lines of
 * one agency) follows the name's agencies — its agency is shown, never changed here.
 */
export function SubNameLine({ sub, onOpen }: { sub: SubName; onOpen?: () => void }) {
  const set = useSetSubNameCategory()
  const remove = useDeleteSubName()
  const create = useCreateAccount()
  const [editing, setEditing] = useState(false)
  const [choice, setChoice] = useState(categoryChoice(sub.category))
  const save = async () => {
    const category = await resolveChoice(choice, create)
    if (!category) return
    set.mutate({ id: sub.id, category }, { onSuccess: () => setEditing(false) })
  }
  const error = set.error ?? remove.error ?? create.error
  return (
    <div className="mt-0.5 text-xs">
      <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
        <CornerDownRight className="size-3.5 shrink-0 text-brand/60" />
        {onOpen ? (
          <button type="button" onClick={onOpen} className="min-w-0 truncate font-medium text-[#0B1C2C] hover:underline" title="See its rows">
            {sub.name}
          </button>
        ) : (
          <span className="min-w-0 truncate font-medium text-[#0B1C2C]">{sub.name}</span>
        )}
        {sub.tax ? (
          <span
            title="Its tax lines — set by the name's tax agencies"
            className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800 ring-1 ring-amber-600/20"
          >
            {sub.category}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            title="Change this sub-name's category — every row of it moves"
            className="shrink-0 rounded-md bg-brand/10 px-1.5 py-0.5 font-medium text-brand hover:bg-brand/15"
          >
            {sub.category}
          </button>
        )}
        <span className="shrink-0 tabular-nums">
          · {sub.rows} {sub.tax ? 'tax line' : 'row'}
          {sub.rows === 1 ? '' : 's'}
        </span>
        <span
          className={cn('shrink-0 font-medium tabular-nums', sub.total < 0 ? 'text-red-600' : 'text-emerald-700')}
          title="Total of this sub-name"
        >
          · {money(sub.total ?? 0)}
        </span>
        {!sub.tax && (
          <button
            type="button"
            onClick={() => remove.mutate(sub.id)}
            disabled={remove.isPending}
            title="Remove this sub-name — its rows go back to the name's category"
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {editing && (
        <div className="mt-1 ml-5 flex max-w-sm flex-col gap-1.5">
          <CategoryField value={choice} onChange={setChoice} />
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="xs"
              disabled={!choiceReady(choice) || choice.category === sub.category || set.isPending || create.isPending}
              onClick={() => void save()}
            >
              Save
            </Button>
            <Button type="button" size="xs" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {!!error && <p className="ml-5 text-red-600">{error.message}</p>}
    </div>
  )
}
