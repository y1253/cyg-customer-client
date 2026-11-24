import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import i18n from '@/i18n'
import { useSaveAgency } from '@/hooks/useSaveAgency'
import { useSaveSplitGroup } from '@/hooks/useSplitGroups'
import { useTax } from '@/hooks/useTax'
import { categoryChoice, choiceReady, resolveChoice, type CategoryChoice } from '@/lib/categoryChoice'
import { sortByLabel } from '@/lib/sort'
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

/** The rule's rates for the API, or the message to show (in the site's language). */
function ratesOf(rule: RuleForm): TaxAgencyInput['rates'] | string {
  const name = rule.name.trim()
  if (!name) return i18n.t('names:agencyDialog.needName')
  const chosen = KINDS.filter((k) => rule.rates[k].value.trim() !== '')
  if (!chosen.length) return i18n.t('names:agencyDialog.needRate', { name })
  const out: TaxAgencyInput['rates'] = []
  for (const kind of chosen) {
    const { mode, value: typed } = rule.rates[kind]
    // A French decimal comma ("2,50") is a decimal point.
    const value = Number(typed.trim().replace(',', '.'))
    const side = TAX_KIND_LABEL[kind]
    if (!Number.isFinite(value)) return i18n.t('names:agencyDialog.notNumber', { name, side })
    if (mode === 'PERCENT' && (value < 0 || value > 100)) return i18n.t('names:agencyDialog.percentRange', { name, side })
    if (mode === 'FIXED' && value <= 0) return i18n.t('names:agencyDialog.amountPositive', { name, side })
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
  const { t } = useTranslation(['names', 'common'])
  const save = useSaveAgency()
  const saveGroup = useSaveSplitGroup()
  const create = useCreateAccount()
  const tax = useTax().data
  const groups = tax?.groups ?? []
  // step12 (2026-11-22): A–Z.
  const rules = sortByLabel(tax?.agencies ?? [], (a) => a.name)
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
    const rates = ratesOf(rule)
    if (typeof rates === 'string') return setError(rates)
    if (ownCategory && !choiceReady(choice)) return setError(t('agencyDialog.pickCategory'))
    setError(null)
    const category = ownCategory ? await resolveChoice(choice, create) : null
    if (ownCategory && !category) return setError(t('agencyDialog.categoryFailed'))
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
    if (!name) return setError(t('agencyDialog.needGroupName'))
    const ids = picked.filter((id) => rules.some((a) => a.id === id))
    if (!ids.length && !splitGroup) return setError(t('agencyDialog.needGroupRule'))
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
                  ? t('agencyDialog.editGroup')
                  : agency
                    ? t('agencyDialog.editRule')
                    : step === 'group'
                      ? t('agencyDialog.addGroup')
                      : t('agencyDialog.addRule'))}
            </DialogTitle>
            <DialogDescription>
              {description ??
                (step === 'choose'
                  ? t('agencyDialog.chooseText')
                  : step === 'group'
                    ? t('agencyDialog.groupText')
                    : t('agencyDialog.ruleText'))}
            </DialogDescription>
          </DialogHeader>

          {step === 'choose' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceButton
                icon={<Split className="size-5" />}
                title={t('agencyDialog.individual')}
                text={t('agencyDialog.individualText')}
                onClick={() => setStep('individual')}
              />
              <ChoiceButton
                icon={<Layers className="size-5" />}
                title={t('agencyDialog.group')}
                text={t('agencyDialog.groupChoiceText')}
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
                  {t('common:actions.back')}
                </button>
              )}
              {step === 'individual' ? (
                <RuleFields rule={rule} onChange={setRule} autoFocus />
              ) : (
                <>
                  <div className="grid gap-1.5">
                    <Label htmlFor="group-name">{t('agencyDialog.groupName')}</Label>
                    <Input
                      id="group-name"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder={t('agencyDialog.groupPlaceholder')}
                      maxLength={191}
                      autoFocus
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t('agencyDialog.rulesInGroup')}</Label>
                    {rules.length === 0 ? (
                      <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
                        {t('agencyDialog.noRules')}
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
                                    {on ? t('agencyDialog.movesFrom', { group: elsewhere }) : t('agency.inGroup', { group: elsewhere })}
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
                      {t('agencyDialog.createRule')}
                    </Button>
                  </div>
                </>
              )}

              {step === 'individual' && (
                <p className="text-xs text-muted-foreground">
                  {t('agencyDialog.percentHelp')}
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
                  {t('agencyDialog.moreOptions')}
                </button>
                {more && (
                  <div className="grid gap-2">
                    {step === 'individual' && (
                      <>
                        <div className="grid gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                          <label className="flex items-center justify-between gap-3">
                            <span>
                              <span className="block text-sm font-medium">{t('agencyDialog.ownCategory')}</span>
                              <span className="block text-xs text-muted-foreground">
                                {ownCategory
                                  ? t('agencyDialog.ownCategoryOn')
                                  : t('agencyDialog.ownCategoryOff', {
                                      name: rule.name.trim() || t('agencyDialog.theRuleName'),
                                    })}
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
                        {t('agencyDialog.withGroup', { group: ownGroup })}
                      </p>
                    ) : (
                      <label className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                        <span>
                          <span className="block text-sm font-medium">{t('active')}</span>
                          <span className="block text-xs text-muted-foreground">
                            {step === 'group' ? t('agencyDialog.activeGroupHelp') : t('agencyDialog.activeHelp')}
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
            <DialogClose render={<Button type="button" variant="outline" />}>{t('common:actions.cancel')}</DialogClose>
            {step !== 'choose' && (
              <Button type="submit" disabled={busy} className="bg-brand text-white hover:bg-brand/85">
                {busy
                  ? t('common:actions.saving')
                  : agency || splitGroup
                    ? t('common:actions.save')
                    : step === 'group'
                      ? t('agencyDialog.submitGroup')
                      : t('agencyDialog.submitRule')}
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
            title={t('agencyDialog.newRuleTitle')}
            description={t('agencyDialog.newRuleText')}
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
  placeholder,
}: {
  rule: RuleForm
  onChange: (rule: RuleForm) => void
  autoFocus?: boolean
  placeholder?: string
}) {
  const { t } = useTranslation(['names', 'common'])
  const setRate = (kind: TaxKind, patch: Partial<RateForm>) =>
    onChange({ ...rule, rates: { ...rule.rates, [kind]: { ...rule.rates[kind], ...patch } } })
  return (
    <div className="grid gap-2">
      <Input
        value={rule.name}
        onChange={(e) => onChange({ ...rule, name: e.target.value })}
        placeholder={placeholder ?? t('agencyDialog.rulePlaceholder')}
        maxLength={191}
        autoFocus={autoFocus}
        aria-label={t('agencyDialog.ruleNameAria')}
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
  const { t } = useTranslation(['names', 'common'])
  const label = TAX_KIND_LABEL[kind]
  return (
    <div className="flex items-center gap-2">
      <span
        className="min-w-8 shrink-0 text-sm font-medium"
        title={kind === 'SALES' ? t('agencyDialog.moneyIn') : t('agencyDialog.moneyOut')}
      >
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
          aria-label={t(rate.mode === 'FIXED' ? 'agencyDialog.amountAria' : 'agencyDialog.rateAria', { side: label })}
        />
        {rate.mode === 'PERCENT' && (
          <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground">
            %
          </span>
        )}
      </div>
      <div
        role="group"
        aria-label={t('agencyDialog.modeAria', { side: label })}
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
