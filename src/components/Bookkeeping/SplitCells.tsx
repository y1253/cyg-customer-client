import { useState, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { UNCLARIFIED_NAME, type LedgerTransaction, type SplitEdit } from '@/api/bookkeeping'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateAccount } from '@/hooks/useCreateAccount'
import { useNames } from '@/hooks/useNames'
import { useRuleConflict } from '@/hooks/useRuleConflict'
import { useDeleteSplit, useEditSplit, useSetProduct } from '@/hooks/useSplits'
import { categoryChoice, choiceReady, NEW_CATEGORY, resolveChoice } from '@/lib/categoryChoice'
import { cn } from '@/lib/utils'
import { CategoryField } from './CategoryField'
import { NamePicker } from './NamePicker'
import { RuleConflictDialog } from './RuleConflictDialog'

/**
 * step2 (2026-11-15): a split is edited right in its ledger row — no dialog. Each cell
 * saves on its own (`PATCH transactions/:id/split`); the server refuses splits that add up
 * to more than the transaction, and the error shows under the cell.
 */

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Could not save')

function CellError({ error }: { error: unknown }) {
  if (!error) return null
  return <span className="mt-1 block text-[11px] leading-tight font-normal text-red-600">{errorText(error)}</span>
}

/** Two buttons under a cell: which way to save the change. Esc / ✕ cancels. */
function ScopeStrip({ children, onCancel }: { children: ReactNode; onCancel: () => void }) {
  return (
    <span
      className="mt-1.5 flex flex-col gap-1 rounded-md bg-amber-50 p-1.5 text-[11px] font-normal text-amber-900 ring-1 ring-amber-600/20"
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      {children}
      <button type="button" onClick={onCancel} className="self-start text-muted-foreground hover:underline">
        Cancel
      </button>
    </span>
  )
}

/**
 * The split's amount (what it takes out of the bank amount), typed in place — a split rule's split too.
 * Saved on Enter or when the field is left; a refused amount goes back to the saved one.
 */
export function SplitAmountCell({ t, autoFocus }: { t: LedgerTransaction; autoFocus?: boolean }) {
  const edit = useEditSplit()
  const saved = Math.abs(t.amount).toFixed(2)
  const [text, setText] = useState(saved)
  const [shown, setShown] = useState(saved)
  if (saved !== shown) {
    setShown(saved)
    setText(saved)
  }
  const commit = () => {
    const value = Number(text.replace(',', '.'))
    if (!Number.isFinite(value) || value < 0) {
      setText(saved)
      return
    }
    if (value.toFixed(2) === saved) return
    edit.mutate({ id: t.id, values: { amount: Math.round(value * 100) / 100 } }, { onError: () => setText(saved) })
  }
  return (
    <span className="flex flex-col items-end">
      <span className="flex items-center gap-1">
        <span className={cn('text-xs', t.amount < 0 ? 'text-red-600' : 'text-emerald-700')}>{t.amount < 0 ? '−' : '+'}</span>
        <Input
          value={text}
          inputMode="decimal"
          aria-label="Split amount"
          title="This split's amount. The splits together may not be more than the transaction."
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') setText(saved)
          }}
          autoFocus={autoFocus}
          onFocus={(e) => e.target.select()}
          disabled={edit.isPending}
          className="h-7 w-24 px-1.5 text-right text-sm tabular-nums"
        />
      </span>
      <CellError error={edit.error} />
    </span>
  )
}

/**
 * The split's name. Another name asks "Only this transaction" (the default) or "Always" —
 * Always moves the transaction's description to that name (asked first when another name
 * has it), the whole transaction included.
 */
export function SplitNameCell({ t }: { t: LedgerTransaction }) {
  const edit = useEditSplit()
  const conflict = useRuleConflict()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const typed = value.trim()
  const changed = typed !== '' && typed.toLowerCase() !== (t.name ?? '').toLowerCase()
  const close = () => {
    setEditing(false)
    setValue('')
  }
  const save = (nameScope: 'ONCE' | 'ALWAYS') => {
    const run = (replace: boolean) =>
      edit.mutate(
        { id: t.id, values: { name: typed, nameScope, replace } },
        { onSuccess: close, onError: (e) => conflict.offer(e, typed, () => run(true)) },
      )
    run(false)
  }
  return (
    <>
      {editing ? (
        <span className="flex flex-col font-normal">
          <NamePicker value={value} onChange={setValue} placeholder={t.name ?? 'Name'} autoFocus className="h-7" />
          {changed ? (
            <ScopeStrip onCancel={close}>
              <span>Give “{typed}” to:</span>
              <span className="flex flex-wrap gap-1">
                <Button type="button" size="xs" disabled={edit.isPending} onClick={() => save('ONCE')}>
                  Only this transaction
                </Button>
                <Button type="button" size="xs" variant="outline" disabled={edit.isPending} onClick={() => save('ALWAYS')}>
                  Always
                </Button>
              </span>
            </ScopeStrip>
          ) : (
            <button type="button" onClick={close} className="mt-1 self-start text-[11px] text-muted-foreground hover:underline">
              Cancel
            </button>
          )}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Change this split's name"
          className="max-w-full truncate rounded text-left hover:text-brand hover:underline"
        >
          {t.subName?.name ?? t.name ?? <span className="font-normal text-muted-foreground italic">{UNCLARIFIED_NAME}</span>}
        </button>
      )}
      {t.subName && !editing && (
        <span className="block truncate text-[11px] font-normal text-muted-foreground" title="Counted under this name">
          under {t.name}
        </span>
      )}
      <CellError error={edit.error && !conflict.pending ? edit.error : null} />
      <RuleConflictDialog conflict={conflict} />
    </>
  )
}

/**
 * The split's category, picked in place. Another category than the name's asks: for ALL
 * the name's rows (the transaction too), or only this split — under the sub-name
 * "<name> - <category>", still counted under the name.
 */
export function SplitCategoryCell({ t }: { t: LedgerTransaction }) {
  const edit = useEditSplit()
  const create = useCreateAccount()
  const names = useNames()
  const [editing, setEditing] = useState(false)
  const [choice, setChoice] = useState(categoryChoice(t.offsetAccount))
  const owner = t.name ?? ''
  const ownCategory = names.data?.names.find((n) => !n.unclarified && n.name.toLowerCase() === owner.toLowerCase())?.category
  const close = () => {
    setEditing(false)
    setChoice(categoryChoice(t.offsetAccount))
  }
  const save = async (categoryScope?: SplitEdit['categoryScope']) => {
    const category = await resolveChoice(choice, create)
    if (!category) return
    edit.mutate({ id: t.id, values: { category, categoryScope } }, { onSuccess: close })
  }
  const picked = choiceReady(choice) && choice.category !== t.offsetAccount
  // The name's own category (or no name) needs no question.
  const plain = !owner || (!!ownCategory && choice.category === ownCategory)
  if (!editing) {
    return (
      <span className="flex flex-col items-start">
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Change this split's category"
          className="inline-flex max-w-full truncate rounded-md bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand ring-brand/40 hover:bg-brand/15 hover:ring-1"
        >
          {t.offsetAccount}
        </button>
        <CellError error={edit.error ?? create.error} />
      </span>
    )
  }
  return (
    <span className="flex flex-col font-normal">
      <CategoryField value={choice} onChange={setChoice} />
      {picked ? (
        <ScopeStrip onCancel={close}>
          {plain ? (
            <Button type="button" size="xs" className="self-start" disabled={edit.isPending} onClick={() => void save()}>
              Save
            </Button>
          ) : (
            <>
              <span>Put it in “{choice.category === NEW_CATEGORY ? choice.newName : choice.category}” for:</span>
              <span className="flex flex-col gap-1">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className="h-auto justify-start py-1 text-left whitespace-normal"
                  disabled={edit.isPending}
                  onClick={() => void save('ALL')}
                >
                  All {owner} rows — the transaction too
                </Button>
                <Button
                  type="button"
                  size="xs"
                  className="h-auto justify-start py-1 text-left whitespace-normal"
                  disabled={edit.isPending}
                  onClick={() => void save('SUB')}
                >
                  Only this — as “{owner} - {choice.category === NEW_CATEGORY ? choice.newName : choice.category}”
                </Button>
              </span>
            </>
          )}
        </ScopeStrip>
      ) : (
        <button type="button" onClick={close} className="mt-1 self-start text-[11px] text-muted-foreground hover:underline">
          Cancel
        </button>
      )}
      <CellError error={edit.error ?? create.error} />
    </span>
  )
}

/** The Product column, typed in place: a split's receipt line, or a whole transaction's. */
export function ProductCell({ t }: { t: LedgerTransaction }) {
  const editSplit = useEditSplit()
  const setProduct = useSetProduct()
  const saved = t.itemName ?? ''
  const [text, setText] = useState(saved)
  const [shown, setShown] = useState(saved)
  if (saved !== shown) {
    setShown(saved)
    setText(saved)
  }
  const commit = () => {
    const value = text.trim()
    if (value === saved) return
    if (t.kind === 'split') editSplit.mutate({ id: t.id, values: { itemName: value } }, { onError: () => setText(saved) })
    else setProduct.mutate({ id: t.id, itemName: value }, { onError: () => setText(saved) })
  }
  return (
    <span className="flex flex-col">
      <Input
        value={text}
        maxLength={191}
        placeholder="—"
        aria-label="Product"
        title="The product this line is for"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') setText(saved)
        }}
        className="h-7 border-transparent bg-transparent px-1.5 text-xs shadow-none hover:border-input focus-visible:border-ring"
      />
      <CellError error={editSplit.error ?? setProduct.error} />
    </span>
  )
}

/** Remove a split: what it took goes back to its transaction. */
export function DeleteSplitButton({ t }: { t: LedgerTransaction }) {
  const remove = useDeleteSplit()
  return (
    <button
      type="button"
      onClick={() => remove.mutate(t.id)}
      disabled={remove.isPending}
      title="Remove this split — its amount goes back to the transaction"
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-red-600 opacity-0 ring-1 ring-red-600/30 transition-opacity group-hover:opacity-100 hover:bg-red-50 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
    >
      <Trash2 className="size-3.5" />
      Remove
    </button>
  )
}
