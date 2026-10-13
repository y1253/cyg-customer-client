import { useState } from 'react'
import { ListChecks, Plus, Trash2 } from 'lucide-react'
import type { SplitInput } from '@/api/bookkeeping'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAttachmentActions } from '@/hooks/useAttachments'
import { useCreateAccount } from '@/hooks/useCreateAccount'
import { useSaveSplits } from '@/hooks/useSplits'
import { money } from '@/lib/money'
import { cn } from '@/lib/utils'
import { categoryChoice, choiceReady, resolveChoice, type CategoryChoice } from '@/lib/categoryChoice'
import { CategoryField } from './CategoryField'
import { NamePicker } from './NamePicker'

/** The transaction being split: its full bank amount, and the splits it already has (amounts positive). */
export type SplitTarget = {
  id: number
  name: string | null
  description: string
  /** What the bank moved — signed. */
  bankAmount: number
  /** Its own category: a new split starts there. */
  category: string
  splits: Array<{ id: number; name: string | null; itemName: string | null; category: string; amount: number }>
  /** Its receipts that list items: "Use receipt items" replaces the splits with those lines. */
  receipts: Array<{ id: number; filename: string }>
}

type Draft = {
  key: string
  id?: number
  amount: string
  name: string
  itemName: string
  /** Remember this item's category for later receipts. */
  always: boolean
  choice: CategoryChoice
}

const cents = (s: string): number => {
  const n = Number(s.replace(/[$,\s]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : NaN
}

/**
 * Split one transaction by hand: parts of it, each with its own amount, name and category.
 * What is left stays on the transaction. The parts may never add up to more than the
 * transaction. Opened again, it edits the existing splits; removing them all un-splits it.
 */
export function SplitDialog({ target, onOpenChange }: { target: SplitTarget | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {target && <SplitForm key={target.id} target={target} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

let seq = 0
const draft = (category: string, from?: SplitTarget['splits'][number]): Draft => ({
  key: `d${++seq}`,
  id: from?.id,
  amount: from ? from.amount.toFixed(2) : '',
  name: from?.name ?? '',
  itemName: from?.itemName ?? '',
  always: false,
  choice: categoryChoice(from?.category ?? category),
})

function SplitForm({ target, onDone }: { target: SplitTarget; onDone: () => void }) {
  const save = useSaveSplits()
  const create = useCreateAccount()
  const { applyItems } = useAttachmentActions()
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    target.splits.length ? target.splits.map((s) => draft(target.category, s)) : [draft(target.category)],
  )

  const total = Math.abs(Math.round(target.bankAmount * 100))
  const amounts = drafts.map((d) => cents(d.amount))
  const used = amounts.reduce((n, a) => n + (Number.isFinite(a) && a > 0 ? a : 0), 0)
  const left = total - used
  const badAmount = drafts.some((d, i) => d.amount.trim() !== '' && !(amounts[i] > 0))
  const problem =
    left < 0
      ? `The splits add up to ${money(used / 100)} — more than the transaction's ${money(total / 100)}.`
      : badAmount
        ? 'Every split needs an amount above $0.00.'
        : null
  const complete = drafts.every((d, i) => amounts[i] > 0 && choiceReady(d.choice))
  const pending = save.isPending || create.isPending || applyItems.isPending
  const canSave = !problem && complete && !pending
  const error = create.error ?? save.error ?? applyItems.error

  const update = (key: string, patch: Partial<Draft>) =>
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)))

  const submit = async () => {
    if (!canSave) return
    const splits: SplitInput[] = []
    for (const [i, d] of drafts.entries()) {
      const category = await resolveChoice(d.choice, create)
      if (!category) return
      const itemName = d.itemName.trim() || null
      splits.push({
        id: d.id,
        name: d.name.trim() || null,
        itemName,
        category,
        amount: amounts[i] / 100,
        always: d.always && !!itemName,
      })
    }
    save.mutate({ id: target.id, splits }, { onSuccess: onDone })
  }

  const sign = target.bankAmount < 0 ? -1 : 1

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>Split {target.name ?? 'this transaction'}</DialogTitle>
        <DialogDescription>
          “{target.description}” — {money(target.bankAmount)}. Each split gets its own name and category; what is
          left stays on the transaction.
        </DialogDescription>
      </DialogHeader>

      <div className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto pr-1">
        {drafts.map((d, i) => (
          <div key={d.key} className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Split {i + 1}</Label>
              <button
                type="button"
                onClick={() => setDrafts((list) => list.filter((x) => x.key !== d.key))}
                className="rounded p-1 text-muted-foreground hover:bg-white hover:text-destructive"
                title="Remove this split"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
              <Input
                inputMode="decimal"
                value={d.amount}
                autoFocus={i === drafts.length - 1 && !d.id}
                placeholder="0.00"
                onChange={(e) => update(d.key, { amount: e.target.value })}
                className={cn('tabular-nums', d.amount.trim() !== '' && !(amounts[i] > 0) && 'border-destructive')}
                aria-label="Amount"
              />
              <NamePicker
                value={d.name}
                onChange={(name) => update(d.key, { name })}
                placeholder={target.name ? `Name (e.g. ${target.name})` : 'Name'}
              />
            </div>
            <Input
              value={d.itemName}
              maxLength={191}
              placeholder="Item (e.g. Pampers) — optional"
              onChange={(e) => update(d.key, { itemName: e.target.value })}
              aria-label="Item"
            />
            <CategoryField value={d.choice} onChange={(choice) => update(d.key, { choice })} />
            {d.itemName.trim() && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={d.always}
                  onChange={(e) => update(d.key, { always: e.target.checked })}
                  className="size-3.5 accent-brand"
                />
                Always put “{d.itemName.trim()}” in this category on future receipts
              </label>
            )}
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDrafts((list) => [...list, draft(target.category)])}
            className="gap-1.5"
          >
            <Plus className="size-4" /> Add a split
          </Button>
          {target.receipts.map((r) => (
            <Button
              key={r.id}
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => applyItems.mutate(r.id, { onSuccess: onDone })}
              className="gap-1.5"
              title={`Replace these splits with one per line of ${r.filename}`}
            >
              <ListChecks className="size-4" /> Use receipt items
              {target.receipts.length > 1 && <span className="text-muted-foreground">· {r.filename}</span>}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
        <span className="text-muted-foreground">Left on the transaction</span>
        <span className={cn('font-semibold tabular-nums', left < 0 ? 'text-destructive' : 'text-[#0B1C2C]')}>
          {money((sign * left) / 100)}
        </span>
      </div>

      {problem && <p className="text-sm text-destructive">{problem}</p>}
      {!drafts.length && target.splits.length > 0 && (
        <p className="text-xs text-muted-foreground">Saving with no splits puts the whole amount back on the transaction.</p>
      )}
      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button
          type="submit"
          disabled={!canSave || (!drafts.length && !target.splits.length)}
          className="bg-brand text-white hover:bg-brand/85"
        >
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}
