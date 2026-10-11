import { useState } from 'react'
import type { LedgerName, UnrecognizedName } from '@/api/bookkeeping'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useChartAccounts } from '@/hooks/useChartAccounts'
import { useSaveNameRule } from '@/hooks/useNameRule'

/** What is being edited: a payee the AI named, or a group of rows it could not name. */
export type NameRuleTarget =
  | { kind: 'name'; view: LedgerName }
  | { kind: 'unrecognized'; view: UnrecognizedName }

/**
 * Edit a payee's name and/or category, or assign an unrecognised description. Saved to the
 * customer's own rules: applied to their existing rows at once and to every statement they
 * upload from now on. Only what was changed is sent — an untouched category stays as it is
 * on each row.
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
        {target && (
          <NameRuleForm
            key={target.kind === 'name' ? `n:${target.view.name}` : `u:${target.view.key}`}
            target={target}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function NameRuleForm({ target, onDone }: { target: NameRuleTarget; onDone: () => void }) {
  const accounts = useChartAccounts()
  const save = useSaveNameRule()
  const initialName = target.kind === 'name' ? target.view.name : ''
  const initialCategory = target.view.category
  const [name, setName] = useState(initialName)
  const [category, setCategory] = useState<string | null>(initialCategory)

  const trimmed = name.trim()
  const nameChanged = trimmed !== '' && trimmed !== initialName
  const categoryChanged = !!category && category !== initialCategory
  const canSave = (nameChanged || categoryChanged) && !save.isPending

  const submit = () => {
    if (!canSave) return
    save.mutate(
      {
        ...(target.kind === 'name'
          ? { matchType: 'NAME' as const, matchKey: target.view.ruleKey }
          : { matchType: 'DESCRIPTION' as const, matchKey: target.view.key }),
        name: nameChanged ? trimmed : null,
        category: categoryChanged ? category : null,
      },
      { onSuccess: onDone },
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>{target.kind === 'name' ? `Edit ${target.view.name}` : 'Name this transaction'}</DialogTitle>
        <DialogDescription>
          {target.kind === 'name'
            ? `Changes all ${target.view.rows.toLocaleString()} row${target.view.rows === 1 ? '' : 's'} with this name, and every statement you upload from now on.`
            : `“${target.view.sampleDescription}” — ${target.view.rows.toLocaleString()} row${target.view.rows === 1 ? '' : 's'}. Saved to your account and used for every statement you upload from now on.`}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name-rule-name">Name</Label>
        <Input
          id="name-rule-name"
          value={name}
          maxLength={191}
          placeholder={target.kind === 'name' ? target.view.name : 'e.g. BMO, Hydro-Québec, John Smith'}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a category" />
          </SelectTrigger>
          <SelectContent>
            {(accounts.data ?? []).map((a) => (
              <SelectItem key={a.name} value={a.name}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {target.view.otherCategories > 0 && !categoryChanged && (
          <p className="text-xs text-muted-foreground">
            Its rows have {target.view.otherCategories + 1} different categories. Choose one to put them all in it.
          </p>
        )}
      </div>

      {save.error && <p className="text-sm text-destructive">{save.error.message}</p>}

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={!canSave} className="bg-brand text-white hover:bg-brand/85">
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}
