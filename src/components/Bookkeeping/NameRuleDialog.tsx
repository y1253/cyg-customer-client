import { useState } from 'react'
import {
  CONTAINS_MIN,
  type EditScope,
  type LedgerName,
  type LedgerTransaction,
  type UnrecognizedName,
} from '@/api/bookkeeping'
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
import { useCreateAccount } from '@/hooks/useCreateAccount'
import { useClosingValue } from '@/hooks/useClosingValue'
import { useEditTransaction } from '@/hooks/useEditTransaction'
import { useSaveNameRule } from '@/hooks/useNameRule'
import { cn } from '@/lib/utils'
import { NEW_CATEGORY, categoryChoice, choiceReady, resolveChoice } from '@/lib/categoryChoice'
import { CategoryField } from './CategoryField'
import { NameDescriptionsEditor } from './NameDescriptionsEditor'
import { NamePicker } from './NamePicker'

/** What is being edited: a payee, a group of rows the AI could not name, or one ledger row. */
export type NameRuleTarget =
  | { kind: 'name'; view: LedgerName }
  | { kind: 'unrecognized'; view: UnrecognizedName }
  | { kind: 'transaction'; view: LedgerTransaction }

/**
 * Change a name and/or category — for a payee on the Names tab, a group of unrecognised
 * rows, or one ledger row. A name has ONE category: picking one moves every transaction of
 * that name, always. "Always / Only this row" is for the NAME only: every transaction with
 * this description (and every later statement), or just this one. A name, once there, can
 * be changed but not cleared; a row the AI could not name may stay "Unclarified name" and
 * still get its description's category. A hand-made split only ever changes itself.
 * "Contains text" (step2) saves a CONTAINS rule instead: every description holding the
 * text (trimmed from this one) gets the name and/or category, now and from now on.
 */
export function NameRuleDialog({
  target,
  onOpenChange,
}: {
  target: NameRuleTarget | null
  onOpenChange: (open: boolean) => void
}) {
  const shown = useClosingValue(target)
  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {/* Keyed so the form starts from the row's own values every time it opens. */}
        {shown && <NameRuleForm key={keyOf(shown)} target={shown} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function keyOf(t: NameRuleTarget): string {
  if (t.kind === 'name') return `n:${t.view.name}`
  if (t.kind === 'unrecognized') return `u:${t.view.key}`
  return `t:${t.view.key}`
}

function NameRuleForm({ target, onDone }: { target: NameRuleTarget; onDone: () => void }) {
  const create = useCreateAccount()
  const saveRule = useSaveNameRule()
  const editRow = useEditTransaction()

  const initialName = target.kind === 'unrecognized' ? '' : (target.view.name ?? '')
  const initialCategory = target.kind === 'transaction' ? target.view.offsetAccount : target.view.category
  const [name, setName] = useState(initialName)
  const [choice, setChoice] = useState(categoryChoice(initialCategory))
  const isSplit = target.kind === 'transaction' && target.view.kind === 'split'
  const [scope, setScope] = useState<EditScope | 'CONTAINS'>(isSplit ? 'ONCE' : 'ALWAYS')
  const [containsText, setContainsText] = useState(
    target.kind === 'transaction'
      ? target.view.description
      : target.kind === 'unrecognized'
        ? target.view.sampleDescription
        : '',
  )

  const trimmed = name.trim()
  const nameChanged = trimmed !== '' && trimmed !== initialName
  // A name is required once there is one: it can be changed, never cleared.
  const nameMissing = initialName !== '' && trimmed === ''
  const finalName = trimmed || initialName
  // "Always / Only this row" is about the NAME on a description's rows — a payee on the
  // Names tab is always renamed everywhere, and a category is always the name's own.
  // "Contains text" is offered for any change, so a category alone can become a rule too.
  const canScope = target.kind !== 'name' && !isSplit
  const contains = canScope && scope === 'CONTAINS'
  const categoryChanged =
    choiceReady(choice) && (choice.category === NEW_CATEGORY || choice.category !== initialCategory)
  const pending = create.isPending || saveRule.isPending || editRow.isPending
  const containsTrimmed = containsText.trim()
  const canSave = contains
    ? containsTrimmed.length >= CONTAINS_MIN && (nameChanged || choiceReady(choice)) && !nameMissing && !pending
    : (nameChanged || categoryChanged) && !nameMissing && !pending
  const error = create.error ?? saveRule.error ?? editRow.error

  const submit = async () => {
    if (!canSave) return
    if (contains) {
      // The text is the rule: its category goes with it as picked; a name only when one was
      // typed — the row's own name would otherwise rename every matching transaction.
      const category = choiceReady(choice) ? await resolveChoice(choice, create) : null
      if (choiceReady(choice) && !category) return
      saveRule.mutate(
        {
          matchType: 'CONTAINS',
          matchKey: containsTrimmed,
          name: nameChanged ? trimmed : null,
          category,
          scope: 'ALWAYS',
        },
        { onSuccess: onDone },
      )
      return
    }
    const chosen = categoryChanged ? await resolveChoice(choice, create) : null
    if (categoryChanged && !chosen) return
    const values = {
      name: nameChanged ? trimmed : null,
      category: chosen,
      scope: target.kind === 'name' || scope === 'CONTAINS' ? ('ALWAYS' as const) : scope,
    }
    if (target.kind === 'transaction') {
      editRow.mutate({ id: target.view.id, ...values }, { onSuccess: onDone })
    } else {
      saveRule.mutate(
        {
          ...(target.kind === 'name'
            ? { matchType: 'NAME' as const, matchKey: target.view.ruleKey }
            : { matchType: 'DESCRIPTION' as const, matchKey: target.view.key }),
          ...values,
        },
        { onSuccess: onDone },
      )
    }
  }

  const rows = target.kind === 'transaction' ? 1 : target.view.rows
  const otherCategories = target.kind === 'transaction' ? 0 : target.view.otherCategories

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>
          {target.kind === 'unrecognized'
            ? 'Name this transaction'
            : `Edit ${target.view.name ?? 'this transaction'}`}
        </DialogTitle>
        <DialogDescription>
          {target.kind === 'transaction' ? (
            <>“{target.view.description}”</>
          ) : target.kind === 'unrecognized' ? (
            <>
              “{target.view.sampleDescription}” — {rows.toLocaleString()} row{rows === 1 ? '' : 's'}
            </>
          ) : (
            <>
              {rows.toLocaleString()} row{rows === 1 ? '' : 's'} with this name
            </>
          )}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name-rule-name">Name</Label>
        <NamePicker
          id="name-rule-name"
          value={name}
          placeholder={initialName || 'Unclarified name'}
          onChange={setName}
        />
        {nameMissing && <p className="text-xs text-destructive">A name is required.</p>}
      </div>

      {canScope && (
        <div className="flex flex-col gap-1.5">
          <Label>Apply to</Label>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {(
              [
                { id: 'ALWAYS', label: 'This description' },
                { id: 'CONTAINS', label: 'Contains text' },
                { id: 'ONCE', label: target.kind === 'transaction' ? 'Only this row' : 'Only these rows' },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setScope(o.id)}
                className={cn(
                  'rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                  scope === o.id ? 'bg-white text-[#0B1C2C] shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          {contains && (
            <>
              <Input
                aria-label="Description contains"
                value={containsText}
                onChange={(e) => setContainsText(e.target.value)}
                maxLength={191}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Trim it to the part every description has. At least {CONTAINS_MIN} characters; capital letters
                don't matter.
              </p>
            </>
          )}
          <p className="text-xs text-muted-foreground">
            {contains
              ? `Every transaction whose description contains this text gets ${nameChanged ? `the name “${trimmed}” and its category` : 'this category'} — in this ledger and every statement from now on. A rule for one exact description still wins.`
              : scope === 'ALWAYS'
              ? 'Every transaction with this description gets this name — in this ledger and every statement you upload from now on.'
              : target.kind === 'transaction'
                ? 'Only this transaction gets this name. Nothing is saved for the future.'
                : 'Only the rows already in your ledger get this name. Nothing is saved for the future.'}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Category</Label>
        <CategoryField value={choice} onChange={setChoice} />
        {otherCategories > 0 && !categoryChanged && (
          <p className="text-xs text-muted-foreground">
            Its rows have {otherCategories + 1} different categories. Choose one to put them all in it.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {isSplit
            ? 'A split belongs to its one transaction: this changes only this split.'
            : finalName
              ? `A name has one category: every transaction named “${finalName}” goes in it.`
              : 'Every unnamed transaction with this description goes in it.'}
        </p>
      </div>

      {/* step9: the descriptions this name follows, and its group — saved as they change. */}
      {target.kind === 'name' && <NameDescriptionsEditor name={target.view.name} />}

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={!canSave} className="bg-brand text-white hover:bg-brand/85">
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}
