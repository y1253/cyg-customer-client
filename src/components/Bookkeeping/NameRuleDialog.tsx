import { useState } from 'react'
import type {
  AccountType,
  EditScope,
  LedgerName,
  LedgerTransaction,
  UnrecognizedName,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useChartAccounts } from '@/hooks/useChartAccounts'
import { useCreateAccount } from '@/hooks/useCreateAccount'
import { useEditTransaction } from '@/hooks/useEditTransaction'
import { useSaveNameRule } from '@/hooks/useNameRule'
import { cn } from '@/lib/utils'

/** What is being edited: a payee, a group of rows the AI could not name, or one ledger row. */
export type NameRuleTarget =
  | { kind: 'name'; view: LedgerName }
  | { kind: 'unrecognized'; view: UnrecognizedName }
  | { kind: 'transaction'; view: LedgerTransaction }

/** The Select's value for "type in a category of my own". Never a real account name. */
const NEW_CATEGORY = '__new__'

const TYPE_LABEL: Record<AccountType, string> = {
  INCOME: 'Income',
  EXPENSE: 'Expense',
  ASSET: 'Asset',
  LIABILITY: 'Liability',
  EQUITY: 'Equity',
}

/**
 * Change a name and/or category — for a payee on the Names tab, a group of unrecognised
 * rows, or one ledger row. "Always" saves it to the customer's account (their existing rows
 * and every statement from now on); "One time" changes only what is in the ledger now (one
 * row, from the ledger) and is never applied again. A category can be typed in when nothing
 * in the list fits. Only what was changed is sent.
 */
export function NameRuleDialog({
  target,
  onOpenChange,
}: {
  target: NameRuleTarget | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Keyed so the form starts from the row's own values every time it opens. */}
        {target && <NameRuleForm key={keyOf(target)} target={target} onDone={() => onOpenChange(false)} />}
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
  const accounts = useChartAccounts()
  const create = useCreateAccount()
  const saveRule = useSaveNameRule()
  const editRow = useEditTransaction()

  const initialName = target.kind === 'unrecognized' ? '' : (target.view.name ?? '')
  const initialCategory = target.kind === 'transaction' ? target.view.offsetAccount : target.view.category
  const [name, setName] = useState(initialName)
  const [category, setCategory] = useState<string | null>(initialCategory)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<AccountType | null>('EXPENSE')
  const [scope, setScope] = useState<EditScope>('ALWAYS')

  const trimmed = name.trim()
  const nameChanged = trimmed !== '' && trimmed !== initialName
  const creating = category === NEW_CATEGORY
  const categoryChanged = creating ? !!newName.trim() && !!newType : !!category && category !== initialCategory
  const pending = create.isPending || saveRule.isPending || editRow.isPending
  const canSave = (nameChanged || categoryChanged) && !pending
  const error = create.error ?? saveRule.error ?? editRow.error

  const submit = async () => {
    if (!canSave) return
    let chosen = categoryChanged ? category : null
    if (creating) {
      const made = await create.mutateAsync({ name: newName.trim(), type: newType! }).catch(() => null)
      if (!made) return
      chosen = made.name
    }
    const values = { name: nameChanged ? trimmed : null, category: chosen, scope }
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
  const own = (accounts.data ?? []).filter((a) => a.custom)
  const chart = (accounts.data ?? []).filter((a) => !a.custom)

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
        <Input
          id="name-rule-name"
          value={name}
          maxLength={191}
          placeholder={initialName || 'e.g. BMO, Hydro-Québec, John Smith'}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a category">
              {(v: string | null) => (v === NEW_CATEGORY ? 'New category…' : v)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {chart.map((a) => (
              <SelectItem key={a.name} value={a.name}>
                {a.name}
              </SelectItem>
            ))}
            {own.length > 0 && <SelectSeparator />}
            {own.map((a) => (
              <SelectItem key={a.name} value={a.name}>
                {a.name} <span className="text-xs text-muted-foreground">· {TYPE_LABEL[a.type]}</span>
              </SelectItem>
            ))}
            <SelectSeparator />
            <SelectItem value={NEW_CATEGORY}>+ New category…</SelectItem>
          </SelectContent>
        </Select>
        {creating && (
          <div className="mt-1 flex flex-col gap-2 rounded-lg bg-muted/50 p-3 sm:flex-row">
            <Input
              autoFocus
              value={newName}
              maxLength={191}
              placeholder="Your category, e.g. Groceries"
              onChange={(e) => setNewName(e.target.value)}
              className="sm:flex-1"
            />
            <Select value={newType} onValueChange={(v) => setNewType(v as AccountType | null)}>
              <SelectTrigger className="sm:w-36">
                <SelectValue placeholder="Kind">
                  {(v: AccountType | null) => (v ? TYPE_LABEL[v] : null)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABEL) as AccountType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {otherCategories > 0 && !categoryChanged && (
          <p className="text-xs text-muted-foreground">
            Its rows have {otherCategories + 1} different categories. Choose one to put them all in it.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Apply</Label>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(
            [
              {
                id: 'ALWAYS',
                label: 'Always',
                hint: 'Saved to your account: also every statement you upload from now on.',
              },
              {
                id: 'ONCE',
                label: target.kind === 'transaction' ? 'Only this row' : 'One time',
                hint:
                  target.kind === 'transaction'
                    ? 'Only this transaction. Nothing is saved for the future.'
                    : 'Only the rows already in your ledger. Nothing is saved for the future.',
              },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setScope(o.id)}
              title={o.hint}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                scope === o.id ? 'bg-white text-[#0B1C2C] shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {scope === 'ALWAYS'
            ? 'Saved to your account — used for this ledger and every statement you upload from now on.'
            : target.kind === 'transaction'
              ? 'Changes only this transaction. Nothing is saved for the future.'
              : 'Changes only the rows already in your ledger. Nothing is saved for the future.'}
        </p>
      </div>

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
