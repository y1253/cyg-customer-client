import { useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronLeft, Layers, Plus, Split } from 'lucide-react'
import {
  rateLabel,
  TAX_KIND_LABEL,
  type RateMode,
  type SplitGroup,
  type TaxAgency,
  type TaxAgencyInput,
  type TaxKind,
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
import { Switch } from '@/components/ui/switch'
import { useCreateAccount } from '@/hooks/useCreateAccount'
import { useSaveAgency } from '@/hooks/useSaveAgency'
import { useSaveSplitGroup } from '@/hooks/useSplitGroups'
import { useTax } from '@/hooks/useTax'
import { categoryChoice, choiceReady, resolveChoice, type CategoryChoice } from '@/lib/categoryChoice'
import { cn } from '@/lib/utils'
import { CategoryField } from './CategoryField'

const KINDS: TaxKind[] = ['SALES', 'PURCHASE']

/** One direction of a rule as typed; a blank value = the rule does not take that side. */
type RateForm = { mode: RateMode; value: string }
/** The rule being typed. */
type RuleForm = { name: string; rates: Record<TaxKind, RateForm> }

const blankRule = (): RuleForm => ({
  name: '',
  rates: { SALES: { mode: 'PERCENT', value: '' }, PURCHASE: { mode: 'PERCENT', value: '' } },
})

const ruleOf = (agency: TaxAgency): RuleForm => {
  const rate = (kind: TaxKind): RateForm => {
    const r = agency.rates.find((x) => x.kind === kind)
    if (!r) return { mode: 'PERCENT', value: '' }
    return { mode: r.mode, value: String(r.mode === 'FIXED' ? (r.amount ?? '') : r.rate) }
  }
  return { name: agency.name, rates: { SALES: rate('SALES'), PURCHASE: rate('PURCHASE') } }
}

/** The rule's rates for the API, or the message to show. `label` names it in the message. */
function ratesOf(rule: RuleForm, label: string): TaxAgencyInput['rates'] | string {
  if (!rule.name.trim()) return `Give ${label} a name.`
  const chosen = KINDS.filter((k) => rule.rates[k].value.trim() !== '')
  if (!chosen.length) return `Give ${rule.name.trim()} an In rate, an Out rate, or both.`
  const out: TaxAgencyInput['rates'] = []
  for (const kind of chosen) {
    const { mode, value: typed } = rule.rates[kind]
    const value = Number(typed)
    const side = `${rule.name.trim()}'s ${TAX_KIND_LABEL[kind]}`
    if (!Number.isFinite(value)) return `${side} rate is not a number.`
    if (mode === 'PERCENT' && (value < 0 || value > 100)) return `${side} rate is a percent between 0 and 100.`
    if (mode === 'FIXED' && value <= 0) return `${side} amount must be more than 0.`
    out.push(
      mode === 'FIXED'
        ? { kind, mode: 'FIXED', amount: Math.round(value * 100) / 100 }
        : { kind, mode: 'PERCENT', rate: Math.round(value * 1000) / 1000 },
    )
  }
  return out
}

/**
 * step9 part 4 (2026-11-15): add or edit a SPLIT RULE (was a tax agency) — an In rate, an Out rate or both, each
 * a percentage (included in the amount) or a fixed amount, and where its splits go.
 *
 * step9 (2026-11-18): kept simple. A new rule first asks Individual or Group. Individual = Name, In, Out (a blank
 * side is off); Group = the group's name and one or more of those rules, saved together. Its own category, Active
 * sit under "More options". `agency` = edit it.
 *
 * step9 (2026-11-18, part 2): a group is made of EXISTING individual rules, picked from a list; "Create a new split
 * rule" opens the individual form on top (`individual`) and the rule it saves comes back picked.
 *
 * step9 (2026-11-18, part 4): a rule is always edited like an individual one — it never picks its group. Rules
 * join or leave a group ONLY here, in the group window: `splitGroup` = edit that group (its name, Active and the
 * rules ticked). Every rule is offered; one in another group says so, and ticking it moves it here.
 */
export function AgencyDialog({
  open,
  onOpenChange,
  agency,
  title,
  description,
  onSaved,
  splitGroup = null,
  individual = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  agency: TaxAgency | null
  title?: string
  description?: string
  onSaved?: (agency: TaxAgency) => void
  /** Edit this split group (the group window). */
  splitGroup?: SplitGroup | null
  /** Only the individual form (no Individual / Group choice). */
  individual?: boolean
}) {
  const save = useSaveAgency()
  const saveGroup = useSaveSplitGroup()
  const create = useCreateAccount()
  const tax = useTax().data
  const groups = tax?.groups ?? []
  const rules = tax?.agencies ?? []
  const groupNameOf = (id: number | null) => (id === null ? null : (groups.find((g) => g.id === id)?.name ?? null))
  const [step, setStep] = useState<'choose' | 'individual' | 'group'>('choose')
  const [rule, setRule] = useState<RuleForm>(blankRule)
  const [groupName, setGroupName] = useState('')
  /** The rules ticked for the group, in pick order. */
  const [picked, setPicked] = useState<number[]>([])
  const [creating, setCreating] = useState(false)
  const [more, setMore] = useState(false)
  const [ownCategory, setOwnCategory] = useState(false)
  const [choice, setChoice] = useState<CategoryChoice>(categoryChoice(null))
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /**
   * A group save that failed half way: the group made (or its name / Active saved) and the rules moved in or out,
   * so a retry repeats none of it.
   */
  const [madeGroup, setMadeGroup] = useState<number | null>(null)
  const [savedGroup, setSavedGroup] = useState(false)
  const [moved, setMoved] = useState<number[]>([])

  // A fresh form every time it opens.
  useEffect(() => {
    if (!open) return
    setStep(splitGroup ? 'group' : agency || individual ? 'individual' : 'choose')
    setRule(agency ? ruleOf(agency) : blankRule())
    setGroupName(splitGroup?.name ?? '')
    setPicked(splitGroup?.agencyIds ?? [])
    setCreating(false)
    setMore(false)
    setOwnCategory(!!agency?.category)
    setChoice(categoryChoice(agency?.category ?? null))
    setActive(splitGroup?.active ?? agency?.active ?? true)
    setError(null)
    setMadeGroup(null)
    setSavedGroup(false)
    setMoved([])
    save.reset()
    saveGroup.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agency, splitGroup])

  const finish = (saved: TaxAgency) => {
    onSaved?.(saved)
    onOpenChange(false)
  }

  const submitIndividual = async () => {
    const rates = ratesOf(rule, 'the split rule')
    if (typeof rates === 'string') return setError(rates)
    if (ownCategory && !choiceReady(choice)) return setError('Pick the category, or switch "Its own category" off.')
    setError(null)
    const category = ownCategory ? await resolveChoice(choice, create) : null
    if (ownCategory && !category) return setError('The new category could not be made.')
    // step9 (2026-11-18): a rule in a group is switched on / off on its group. Its group is never sent: it
    // changes only in the group window.
    const values: Partial<TaxAgencyInput> = {
      name: rule.name.trim(),
      rates,
      category,
      ...(!agency?.groupId && { active }),
    }
    save.mutate({ ...values, id: agency?.id }, { onSuccess: finish })
  }

  const submitGroup = async () => {
    const name = groupName.trim()
    if (!name) return setError('Give the group a name.')
    const ids = picked.filter((id) => rules.some((a) => a.id === id))
    if (!ids.length && !splitGroup) return setError('Pick at least one split rule for the group.')
    setError(null)
    let id = splitGroup?.id ?? madeGroup
    if (id === null) {
      try {
        id = (await saveGroup.mutateAsync({ name, active })).id
      } catch {
        return
      }
      setMadeGroup(id)
    } else if (splitGroup && !savedGroup && (name !== splitGroup.name || active !== splitGroup.active)) {
      try {
        await saveGroup.mutateAsync({ id, name, active })
      } catch {
        return
      }
      setSavedGroup(true)
    }
    // Ticked rules join (from another group too); a former member left unticked becomes individual again.
    const before = splitGroup?.agencyIds ?? []
    const changes: Array<[number, number | null]> = [
      ...ids.filter((x) => !before.includes(x)).map((x): [number, number | null] => [x, id]),
      ...before.filter((x) => !ids.includes(x)).map((x): [number, number | null] => [x, null]),
    ]
    let last: TaxAgency | null = null
    const done = [...moved]
    for (const [ruleId, groupId] of changes) {
      if (done.includes(ruleId)) continue
      try {
        last = await save.mutateAsync({ id: ruleId, groupId })
      } catch {
        return
      }
      done.push(ruleId)
      setMoved([...done])
    }
    if (last) finish(last)
    else onOpenChange(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    void (step === 'group' ? submitGroup() : submitIndividual())
  }

  const message = error ?? saveGroup.error?.message ?? save.error?.message
  const busy = save.isPending || create.isPending || saveGroup.isPending
  const ownGroup = groupNameOf(agency?.groupId ?? null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>
              {title ??
                (splitGroup
                  ? 'Edit split group'
                  : agency
                    ? 'Edit split rule'
                    : step === 'group'
                      ? 'Add a split group'
                      : 'Add a split rule')}
            </DialogTitle>
            <DialogDescription>
              {description ??
                (step === 'choose'
                  ? 'What do you want to add?'
                  : step === 'group'
                    ? 'The rules of a group split the same amount together, and are picked on a name as one.'
                    : 'Leave In or Out blank if the rule does not take that side.')}
            </DialogDescription>
          </DialogHeader>

          {step === 'choose' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceButton
                icon={<Split className="size-5" />}
                title="Individual"
                text="One rule, e.g. GST"
                onClick={() => setStep('individual')}
              />
              <ChoiceButton
                icon={<Layers className="size-5" />}
                title="Group"
                text="Several rules that split the same amount together, e.g. GST + QST"
                onClick={() => setStep('group')}
              />
            </div>
          ) : (
            <div className="grid min-w-0 gap-4">
              {!agency && !splitGroup && !individual && (
                <button
                  type="button"
                  onClick={() => {
                    setStep('choose')
                    setError(null)
                  }}
                  className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-brand"
                >
                  <ChevronLeft className="size-3.5" />
                  Back
                </button>
              )}
              {step === 'individual' ? (
                <RuleFields rule={rule} onChange={setRule} autoFocus />
              ) : (
                <>
                  <div className="grid gap-1.5">
                    <Label htmlFor="group-name">Group name</Label>
                    <Input
                      id="group-name"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g. Quebec taxes"
                      maxLength={191}
                      autoFocus
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Split rules in the group</Label>
                    {rules.length === 0 ? (
                      <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
                        You have no split rules yet — create one below.
                      </p>
                    ) : (
                      <ul className="grid max-h-64 gap-1 overflow-y-auto rounded-lg bg-muted/50 p-1.5">
                        {rules.map((a) => {
                          const on = picked.includes(a.id)
                          // A rule of another group: ticking it moves it here.
                          const elsewhere =
                            a.groupId !== null && a.groupId !== splitGroup?.id ? groupNameOf(a.groupId) : null
                          return (
                            <li key={a.id}>
                              <button
                                type="button"
                                aria-pressed={on}
                                onClick={() =>
                                  setPicked((all) => (on ? all.filter((x) => x !== a.id) : [...all, a.id]))
                                }
                                className={cn(
                                  'flex w-full min-w-0 items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-white',
                                  on && 'bg-white',
                                )}
                              >
                                <span
                                  className={cn(
                                    'flex size-4 shrink-0 items-center justify-center rounded border',
                                    on ? 'border-brand bg-brand text-white' : 'border-muted-foreground/40 bg-white',
                                  )}
                                >
                                  {on && <Check className="size-3" />}
                                </span>
                                <span className="min-w-0 truncate font-medium text-[#0B1C2C]">{a.name}</span>
                                {elsewhere && (
                                  <span className="shrink-0 rounded bg-amber-100 px-1.5 text-[11px] text-amber-800">
                                    {on ? `moves from ${elsewhere}` : `in ${elsewhere}`}
                                  </span>
                                )}
                                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                  {a.rates.map(rateLabel).join(' · ')}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCreating(true)}
                      className="w-fit gap-1.5"
                    >
                      <Plus className="size-4" />
                      Create a new split rule
                    </Button>
                  </div>
                </>
              )}

              {step === 'individual' && (
                <p className="text-xs text-muted-foreground">
                  A percentage is taken out of the amount: $100 at 10% splits off $9.09.
                </p>
              )}

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setMore(!more)}
                  aria-expanded={more}
                  className="inline-flex w-fit items-center gap-1 text-sm font-medium text-brand hover:underline"
                >
                  <ChevronDown className={cn('size-4 transition-transform', more && 'rotate-180')} />
                  More options
                </button>
                {more && (
                  <div className="grid gap-2">
                    {step === 'individual' && (
                      <>
                        <div className="grid gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                          <label className="flex items-center justify-between gap-3">
                            <span>
                              <span className="block text-sm font-medium">Its own category</span>
                              <span className="block text-xs text-muted-foreground">
                                {ownCategory
                                  ? 'The splits go to this category.'
                                  : `Off: the splits go to its own account, “${rule.name.trim() || 'the rule’s name'}”.`}
                              </span>
                            </span>
                            <Switch checked={ownCategory} onCheckedChange={setOwnCategory} className="data-checked:bg-brand" />
                          </label>
                          {ownCategory && <CategoryField value={choice} onChange={setChoice} />}
                        </div>
                      </>
                    )}
                    {step === 'individual' && ownGroup ? (
                      <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
                        Switched on and off with its group, {ownGroup}.
                      </p>
                    ) : (
                      <label className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                        <span>
                          <span className="block text-sm font-medium">Active</span>
                          <span className="block text-xs text-muted-foreground">
                            {step === 'group'
                              ? 'Switches all the rules of the group on or off. Only active rules split new transactions.'
                              : 'Only active rules split new transactions.'}
                          </span>
                        </span>
                        <Switch checked={active} onCheckedChange={setActive} className="data-checked:bg-brand" />
                      </label>
                    )}
                  </div>
                )}
              </div>

              {message && (
                <p role="alert" className="text-sm text-destructive">
                  {message}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            {step !== 'choose' && (
              <Button type="submit" disabled={busy} className="bg-brand text-white hover:bg-brand/85">
                {busy ? 'Saving…' : agency || splitGroup ? 'Save' : step === 'group' ? 'Add group' : 'Add split rule'}
              </Button>
            )}
          </DialogFooter>
        </form>
        {/* Inside the content (so it nests) but outside the form (so its submit never reaches this one). */}
        {step === 'group' && (
          <AgencyDialog
            open={creating}
            onOpenChange={setCreating}
            agency={null}
            individual
            title="New split rule"
            description="It joins the list, picked for this group."
            onSaved={(a) => setPicked((all) => (all.includes(a.id) ? all : [...all, a.id]))}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ChoiceButton({
  icon,
  title,
  text,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  text: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors hover:border-brand hover:bg-brand/5"
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-brand/10 text-brand">{icon}</span>
      <span className="font-medium text-[#0B1C2C]">{title}</span>
      <span className="text-xs text-muted-foreground">{text}</span>
    </button>
  )
}

/** A rule's Name, In and Out. */
function RuleFields({
  rule,
  onChange,
  autoFocus,
  placeholder = 'e.g. GST',
}: {
  rule: RuleForm
  onChange: (rule: RuleForm) => void
  autoFocus?: boolean
  placeholder?: string
}) {
  const setRate = (kind: TaxKind, patch: Partial<RateForm>) =>
    onChange({ ...rule, rates: { ...rule.rates, [kind]: { ...rule.rates[kind], ...patch } } })
  return (
    <div className="grid gap-2">
      <Input
        value={rule.name}
        onChange={(e) => onChange({ ...rule, name: e.target.value })}
        placeholder={placeholder}
        maxLength={191}
        autoFocus={autoFocus}
        aria-label="Rule name"
        className="bg-white"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        {KINDS.map((kind) => (
          <RateField key={kind} kind={kind} rate={rule.rates[kind]} onChange={(patch) => setRate(kind, patch)} />
        ))}
      </div>
    </div>
  )
}

/** "In [5] [%|$]" — a blank value = that side is off. */
function RateField({
  kind,
  rate,
  onChange,
}: {
  kind: TaxKind
  rate: RateForm
  onChange: (patch: Partial<RateForm>) => void
}) {
  const label = TAX_KIND_LABEL[kind]
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-sm font-medium" title={kind === 'SALES' ? 'Money you receive' : 'Money you spend'}>
        {label}
      </span>
      <div className="relative min-w-0 flex-1">
        {rate.mode === 'FIXED' && (
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
        )}
        <Input
          inputMode="decimal"
          value={rate.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder={rate.mode === 'FIXED' ? '2.00' : '5'}
          className={cn('bg-white', rate.mode === 'FIXED' ? 'pl-6' : 'pr-7')}
          aria-label={`${label} ${rate.mode === 'FIXED' ? 'amount' : 'rate'}`}
        />
        {rate.mode === 'PERCENT' && (
          <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground">
            %
          </span>
        )}
      </div>
      <div
        role="group"
        aria-label={`${label}: percentage or fixed amount`}
        className="flex shrink-0 rounded-md bg-white p-0.5 ring-1 ring-black/10"
      >
        {(['PERCENT', 'FIXED'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange({ mode })}
            className={cn(
              'rounded px-2 py-0.5 text-xs font-medium transition-colors',
              rate.mode === mode ? 'bg-brand text-white' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {mode === 'PERCENT' ? '%' : '$'}
          </button>
        ))}
      </div>
    </div>
  )
}
