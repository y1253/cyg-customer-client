import { useState } from 'react'
import { ChevronDown, Plus, TriangleAlert, X } from 'lucide-react'
import {
  CONTAINS_MIN,
  UNCLARIFIED_NAME,
  ruleConflictOf,
  type EditScope,
  type LedgerName,
  type LedgerTransaction,
  type NameField,
  type SplitEdit,
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
import { useNameAgencies } from '@/hooks/useNameAgencies'
import { useNameFields } from '@/hooks/useNameFields'
import { useSetNameGroup } from '@/hooks/useNameGroups'
import { useSaveNameRule } from '@/hooks/useNameRule'
import { useNames } from '@/hooks/useNames'
import { useRuleConflict } from '@/hooks/useRuleConflict'
import { useEditSplit, useSubNames } from '@/hooks/useSplits'
import { useSubNameTools } from '@/hooks/useSubNameTools'
import { useTax } from '@/hooks/useTax'
import { cn } from '@/lib/utils'
import { NEW_CATEGORY, categoryChoice, choiceReady, resolveChoice } from '@/lib/categoryChoice'
import { AgencyPicker } from './AgencyPicker'
import { CategoryField } from './CategoryField'
import { GroupPicker } from './GroupPicker'
import { NameDescriptionsEditor } from './NameDescriptionsEditor'
import { NameFieldsEditor } from './NameFieldsEditor'
import { NamePicker } from './NamePicker'
import { RuleConflictDialog } from './RuleConflictDialog'
import { SubNameSettings } from './SubNameDialog'

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
 * still get its description's category. "Contains text" (step2) saves a CONTAINS rule
 * instead: every description holding the text (trimmed from this one) gets the name and/or
 * category, now and from now on.
 *
 * step12 (2026-11-20): a SPLIT opens this window too (it used to be edited in its cell): its
 * name "Only this transaction" / "Always", and a category other than its name's for "All
 * <name> rows" or "Only this, as a sub-name" — saved through `PATCH transactions/:id/split`.
 * A row under a sub-name ("Walmart - Rent") shows the sub-name and ITS settings; a name
 * with sub-names has no settings of its own (they live on its sub-names).
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
      {/* step2 (2026-11-09): wide enough for every setting, never scrolls sideways. */}
      <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-xl">
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
  const editSplit = useEditSplit()
  const conflict = useRuleConflict()

  const initialName = target.kind === 'unrecognized' ? '' : (target.view.name ?? '')
  const initialCategory = target.kind === 'transaction' ? target.view.offsetAccount : target.view.category
  // step12 (2026-11-20): the row's sub-name ("Walmart - Rent") is what the Name field shows;
  // the row's real name (the parent) still drives the save. Either one typed back = unchanged.
  const rowSub = target.kind === 'transaction' ? target.view.subName : null
  const shownName = rowSub?.name ?? initialName
  const same = (n: string) => n === initialName || (!!rowSub && n === rowSub.name)
  const [name, setName] = useState(shownName)
  const [choice, setChoice] = useState(categoryChoice(initialCategory))
  // step11: picking a name that already exists shows ITS category at once (a name has one),
  // so saving never moves the name into this row's old category by accident. Kept only
  // until the customer picks a category themselves.
  const names = useNames()
  const [adopted, setAdopted] = useState<{ name: string; category: string } | null>(null)
  const existingName = (typed: string) => {
    const key = typed.trim().toLowerCase()
    return key ? names.data?.names.find((n) => !n.unclarified && n.name.toLowerCase() === key) : undefined
  }
  const onNameChange = (next: string) => {
    setName(next)
    const found = existingName(next)
    if (found && !same(found.name) && found.name.toLowerCase() !== initialName.toLowerCase()) {
      if (adopted?.name !== found.name) {
        setAdopted({ name: found.name, category: found.category })
        setChoice(categoryChoice(found.category))
      }
    } else if (adopted) {
      setAdopted(null)
      setChoice(categoryChoice(initialCategory))
    }
  }
  const onCategoryChange = (next: typeof choice) => {
    setAdopted(null)
    setChoice(next)
  }
  const isSplit = target.kind === 'transaction' && target.view.kind === 'split'
  const [scope, setScope] = useState<EditScope | 'CONTAINS'>(isSplit ? 'ONCE' : 'ALWAYS')
  // step12 (2026-11-20): a split's other category — every row of its name, or only this split.
  const [splitScope, setSplitScope] = useState<NonNullable<SplitEdit['categoryScope']>>('SUB')
  // step12 (2026-11-20): the names that have sub-names.
  const subNames = useSubNames()
  const isWrapper = (n: string) => !!subNames.data?.some((s) => s.parent.toLowerCase() === n.toLowerCase())
  const [containsText, setContainsText] = useState(
    target.kind === 'transaction'
      ? target.view.description
      : target.kind === 'unrecognized'
        ? target.view.sampleDescription
        : '',
  )

  const trimmed = name.trim()
  const nameChanged = trimmed !== '' && !same(trimmed)
  // A name is required once there is one: it can be changed, never cleared.
  const nameMissing = initialName !== '' && trimmed === ''
  const finalName = nameChanged ? trimmed : initialName
  // "Always / Only this row" is about the NAME on a description's rows — a payee on the
  // Names tab is always renamed everywhere, and a category is always the name's own.
  // "Contains text" is offered for any change, so a category alone can become a rule too.
  const canScope = target.kind !== 'name'
  const contains = canScope && !isSplit && scope === 'CONTAINS'
  // Moving to a name that exists: the category shown is sent as is — even when it is the
  // row's old one (picked on purpose), which the server would otherwise replace with the name's.
  const toExistingName = nameChanged && !!existingName(trimmed)
  const categoryChanged =
    choiceReady(choice) &&
    (choice.category === NEW_CATEGORY || choice.category !== initialCategory || toExistingName)
  // step2 (2026-11-09): the name's own settings (group, tax, profile) from this dialog. For a
  // name that exists they save at once (NameDescriptionsEditor); for a NEW name they are
  // held here and saved right after the name itself.
  const setGroup = useSetNameGroup()
  const setTax = useNameAgencies()
  const setFields = useNameFields()
  const tax = useTax()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [draftGroup, setDraftGroup] = useState<string | null>(null)
  const [draftAgencies, setDraftAgencies] = useState<number[]>([])
  const [draftAlone, setDraftAlone] = useState(false)
  const [draftFields, setDraftFields] = useState<NameField[]>([])
  // step8 (2026-11-11, `descr.png`): a NEW name's descriptions — every description holding
  // one of these texts gets the name (a CONTAINS rule each), saved right after the name.
  const [draftTexts, setDraftTexts] = useState<string[]>([])
  const [textInput, setTextInput] = useState('')
  const addText = () => {
    const t = textInput.trim()
    if (t.length < CONTAINS_MIN) return
    if (!draftTexts.some((x) => x.toLowerCase() === t.toLowerCase())) setDraftTexts([...draftTexts, t])
    setTextInput('')
  }
  const owner = finalName ? existingName(finalName) : undefined
  const newName = nameChanged && !owner && trimmed.toLowerCase() !== UNCLARIFIED_NAME.toLowerCase()
  const groups = names.data?.groups ?? []
  const applyDraft = async () => {
    if (!newName) return
    if (draftGroup) await setGroup.mutateAsync({ name: trimmed, group: draftGroup })
    if (draftAgencies.length)
      await setTax.mutateAsync({ name: trimmed, agencyIds: draftAgencies, alone: draftAlone })
    if (draftFields.length) await setFields.mutateAsync({ name: trimmed, fields: draftFields })
    await saveTexts(0)
  }
  /**
   * The draft descriptions one by one. One already linked to another name asks first
   * (RuleConflictDialog); "Take it away" saves it with `replace` and goes on with the rest.
   */
  const saveTexts = (i: number, replace = false): Promise<void> => {
    if (i >= draftTexts.length) return Promise.resolve()
    return saveRule
      .mutateAsync({
        matchType: 'CONTAINS',
        matchKey: draftTexts[i],
        name: trimmed,
        category: null,
        scope: 'ALWAYS',
        replace,
      })
      .then(
        () => saveTexts(i + 1),
        (e: unknown) => {
          if (!ruleConflictOf(e)) throw e
          return new Promise<void>((resolve, reject) => {
            conflict.offer(e, trimmed, () => void saveTexts(i, true).then(resolve, reject))
          })
        },
      )
  }
  const finish = () =>
    void applyDraft().then(onDone, () => {
      // The error shows in the dialog; the name itself is saved.
    })
  // step2 (2026-11-09): saving a category other than the name's own moves the name's
  // default — every row of it — so it is said before Save.
  const chosenCategory = choice.category === NEW_CATEGORY ? choice.newName.trim() : (choice.category ?? '')
  const otherThanOwners =
    target.kind !== 'name' &&
    !!owner &&
    categoryChanged &&
    !!chosenCategory &&
    chosenCategory.toLowerCase() !== owner.category.toLowerCase()
  // A split asks instead (all the name's rows, or only this split as a sub-name).
  const overriding = otherThanOwners && !isSplit
  const askSplitScope = otherThanOwners && isSplit

  const pending =
    create.isPending ||
    saveRule.isPending ||
    editRow.isPending ||
    editSplit.isPending ||
    setGroup.isPending ||
    setTax.isPending ||
    setFields.isPending
  const containsTrimmed = containsText.trim()
  const canSave = contains
    ? containsTrimmed.length >= CONTAINS_MIN && (nameChanged || choiceReady(choice)) && !nameMissing && !pending
    : (nameChanged || categoryChanged) && !nameMissing && !pending
  const error = create.error ?? saveRule.error ?? editRow.error ?? editSplit.error ?? setGroup.error ?? setTax.error ?? setFields.error

  const submit = async () => {
    if (!canSave) return
    if (contains) {
      // The text is the rule: its category goes with it as picked; a name only when one was
      // typed — the row's own name would otherwise rename every matching transaction.
      const category = choiceReady(choice) ? await resolveChoice(choice, create) : null
      if (choiceReady(choice) && !category) return
      const run = (replace: boolean) =>
        saveRule.mutate(
          {
            matchType: 'CONTAINS',
            matchKey: containsTrimmed,
            name: nameChanged ? trimmed : null,
            category,
            scope: 'ALWAYS',
            replace,
          },
          { onSuccess: finish, onError: (e) => conflict.offer(e, trimmed, () => run(true)) },
        )
      run(false)
      return
    }
    const chosen = categoryChanged ? await resolveChoice(choice, create) : null
    if (categoryChanged && !chosen) return
    const values = {
      name: nameChanged ? trimmed : null,
      category: chosen,
      scope: target.kind === 'name' || scope === 'CONTAINS' ? ('ALWAYS' as const) : scope,
    }
    // step2: a description already linked to another name asks first (RuleConflictDialog).
    const onError = (retry: () => void) => (e: Error) => conflict.offer(e, trimmed, retry)
    if (isSplit) {
      const id = target.view.id
      const split: SplitEdit = {
        ...(nameChanged && { name: trimmed, nameScope: scope === 'ALWAYS' ? 'ALWAYS' : 'ONCE' }),
        ...(chosen && { category: chosen, ...(askSplitScope && { categoryScope: splitScope }) }),
      }
      const run = (replace: boolean) =>
        editSplit.mutate(
          { id, values: { ...split, ...(replace && { replace }) } },
          { onSuccess: finish, onError: onError(() => run(true)) },
        )
      run(false)
    } else if (target.kind === 'transaction') {
      const id = target.view.id
      const run = (replace: boolean) =>
        editRow.mutate({ id, ...values, replace }, { onSuccess: finish, onError: onError(() => run(true)) })
      run(false)
    } else {
      const ref =
        target.kind === 'name'
          ? { matchType: 'NAME' as const, matchKey: target.view.ruleKey }
          : { matchType: 'DESCRIPTION' as const, matchKey: target.view.key }
      const run = (replace: boolean) =>
        saveRule.mutate({ ...ref, ...values, replace }, { onSuccess: finish, onError: onError(() => run(true)) })
      run(false)
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
      className="flex min-w-0 flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>
          {target.kind === 'unrecognized'
            ? 'Name this transaction'
            : `Edit ${rowSub?.name ?? target.view.name ?? (isSplit ? 'this split' : 'this transaction')}`}
        </DialogTitle>
        <DialogDescription>
          {target.kind === 'transaction' ? (
            <>
              {rowSub && <>Under {target.view.name} · </>}
              {isSplit && <>A split of </>}“{target.view.description}”
            </>
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
          placeholder={shownName || 'Unclarified name'}
          onChange={onNameChange}
        />
        {nameMissing && <p className="text-xs text-destructive">A name is required.</p>}
        {rowSub && !nameChanged && (
          <p className="text-xs text-muted-foreground">
            “{rowSub.name}” is a sub-name of {initialName}. Type another name to move this row; its own name and
            settings are below.
          </p>
        )}
      </div>

      {canScope && (!isSplit || nameChanged) && (
        <div className="flex flex-col gap-1.5">
          <Label>Apply to</Label>
          <div className={cn('grid gap-1 rounded-lg bg-muted p-1', isSplit ? 'grid-cols-2' : 'grid-cols-3')}>
            {(isSplit
              ? ([
                  { id: 'ONCE', label: 'Only this transaction' },
                  { id: 'ALWAYS', label: 'Always' },
                ] as const)
              : ([
                  { id: 'ALWAYS', label: 'This description' },
                  { id: 'CONTAINS', label: 'Contains text' },
                  { id: 'ONCE', label: target.kind === 'transaction' ? 'Only this row' : 'Only these rows' },
                ] as const)
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
            {isSplit
              ? scope === 'ALWAYS'
                ? `Every transaction with this description gets “${trimmed}” — the whole transaction too, now and on every statement from now on.`
                : 'Only this split gets this name. Nothing is saved for the future.'
              : contains
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
        <CategoryField value={choice} onChange={onCategoryChange} />
        {overriding && owner ? (
          <p className="flex gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900 ring-1 ring-amber-600/20">
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            <span>
              “{owner.name}” is in <b>{owner.category}</b>. Saving moves its default to <b>{chosenCategory}</b> —
              all {owner.rows.toLocaleString()} of its row{owner.rows === 1 ? '' : 's'}, and new ones from now on.
            </span>
          </p>
        ) : (
          adopted && (
            <p className="text-xs text-brand">
              “{adopted.name}” is in {adopted.category} — filled in above.{' '}
              {isSplit
                ? 'Pick another to put this split in a sub-name of its own.'
                : 'Pick another category to change its default.'}
            </p>
          )
        )}
        {askSplitScope && owner && (
          <div className="flex flex-col gap-1 rounded-md bg-amber-50 p-1.5 text-xs text-amber-900 ring-1 ring-amber-600/20">
            <span className="px-0.5">
              “{owner.name}” is in <b>{owner.category}</b>. Put it in <b>{chosenCategory}</b> for:
            </span>
            {(
              [
                { id: 'SUB', label: `Only this split — as “${owner.name} - ${chosenCategory}”` },
                { id: 'ALL', label: `All ${owner.name} rows — the transaction too` },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSplitScope(o.id)}
                className={cn(
                  'rounded-md px-2 py-1 text-left font-medium transition-colors',
                  splitScope === o.id ? 'bg-white text-[#0B1C2C] shadow-sm ring-1 ring-amber-600/30' : 'hover:bg-white/60',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
        {otherCategories > 0 && !categoryChanged && (
          <p className="text-xs text-muted-foreground">
            Its rows have {otherCategories + 1} different categories. Choose one to put them all in it.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {isSplit
            ? 'A split keeps its name’s category, or one of its own as a sub-name of the name.'
            : finalName
              ? `A name has one category: every transaction named “${finalName}” goes in it.`
              : 'Every unnamed transaction with this description goes in it.'}
        </p>
      </div>

      {/* step9: the descriptions this name follows, and its group — saved as they change. */}
      {target.kind === 'name' && <NameDescriptionsEditor name={target.view.name} />}

      {/* step12 (2026-11-20): a row under a sub-name shows the sub-name's own settings. */}
      {rowSub && !nameChanged ? (
        <SubNameSection subNameId={rowSub.id} name={rowSub.name} />
      ) : (
        owner &&
        isWrapper(owner.name) && (
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            “{owner.name}” has sub-names: its settings (group, split rules, details) are on each sub-name — open
            one of its rows, or its sub-names on the Names tab.
          </p>
        )
      )}

      {/* step2 (2026-11-09): the name's settings right from a ledger row / an Assign. */}
      {target.kind !== 'name' && !(rowSub && !nameChanged) && !(owner && isWrapper(owner.name)) && (owner || newName) && (
        <div className="flex flex-col rounded-lg ring-1 ring-black/10">
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-expanded={settingsOpen}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[#0B1C2C] hover:bg-muted/40"
          >
            <ChevronDown className={cn('size-4 shrink-0 transition-transform', settingsOpen && 'rotate-180')} />
            <span className="min-w-0 flex-1 truncate">Settings of “{owner?.name ?? trimmed}”</span>
            <span className="hidden shrink-0 text-xs font-normal text-muted-foreground sm:inline">
              group · tax · descriptions · phone &amp; more
            </span>
          </button>
          {settingsOpen && (
            <div className="flex flex-col gap-3 px-3 pt-1 pb-3">
              {owner ? (
                <NameDescriptionsEditor name={owner.name} withTax />
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">A new name — these are saved with it.</p>
                  {groups.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <Label>Group</Label>
                      <GroupPicker groups={groups} value={draftGroup} onChange={setDraftGroup} />
                      <p className="text-xs text-muted-foreground">Left empty, it follows its category.</p>
                    </div>
                  )}
                  {(tax.data?.agencies.length ?? 0) > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <Label>Split rules</Label>
                        <span className="text-xs text-muted-foreground">
                          A rule picked splits {trimmed}'s transactions once, after saving.
                        </span>
                      </div>
                      <AgencyPicker
                        name={trimmed}
                        agencies={tax.data?.agencies ?? []}
                        picked={draftAgencies}
                        alone={draftAlone}
                        pending={false}
                        onChange={(ids, alone) => {
                          setDraftAgencies(ids)
                          setDraftAlone(alone)
                        }}
                        draft
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name-rule-text">Descriptions</Label>
                    <span className="text-xs text-muted-foreground">
                      Every transaction whose description contains one of these gets “{trimmed}” — now and on every
                      statement from now on.
                    </span>
                    {draftTexts.map((t) => (
                      <span key={t} className="flex min-w-0 items-center gap-2 rounded-md bg-muted/60 px-2 py-1 text-sm">
                        <span className="min-w-0 flex-1 truncate">“{t}”</span>
                        <button
                          type="button"
                          onClick={() => setDraftTexts(draftTexts.filter((x) => x !== t))}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label={`Remove “${t}”`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </span>
                    ))}
                    <div className="flex gap-1.5">
                      <Input
                        id="name-rule-text"
                        value={textInput}
                        maxLength={191}
                        placeholder="A description, or part of one"
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addText()
                          }
                        }}
                        className="h-8"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={textInput.trim().length < CONTAINS_MIN}
                        onClick={addText}
                        className="gap-1"
                      >
                        <Plus className="size-3.5" /> Add
                      </Button>
                    </div>
                  </div>
                  <NameFieldsEditor fields={draftFields} onChange={setDraftFields} />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {error && !ruleConflictOf(error) && <p className="text-sm text-destructive">{error.message}</p>}
      <RuleConflictDialog conflict={conflict} />

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={!canSave} className="bg-brand text-white hover:bg-brand/85">
          {pending ? 'Saving…' : overriding ? 'Save & change default' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** step12 (2026-11-20): "Settings of “Walmart - Rent”" — the sub-name's own, folded like a name's. */
function SubNameSection({ subNameId, name }: { subNameId: number; name: string }) {
  const [open, setOpen] = useState(false)
  const tools = useSubNameTools(subNameId)
  return (
    <div className="flex flex-col rounded-lg ring-1 ring-black/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[#0B1C2C] hover:bg-muted/40"
      >
        <ChevronDown className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')} />
        <span className="min-w-0 flex-1 truncate">Settings of “{tools.sub?.name ?? name}”</span>
        <span className="hidden shrink-0 text-xs font-normal text-muted-foreground sm:inline">
          name · group · split rules · phone &amp; more
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 px-3 pt-1 pb-3">
          {tools.sub ? (
            <SubNameSettings
              key={tools.sub.id}
              sub={tools.sub}
              groups={tools.groups}
              parentGroup={tools.parentGroup}
              agencies={tools.agencies}
              parentAgencyIds={tools.parentAgencyIds}
              inline
            />
          ) : (
            <p className="text-xs text-muted-foreground">{tools.loading ? 'Loading…' : 'This sub-name is gone.'}</p>
          )}
        </div>
      )}
    </div>
  )
}
