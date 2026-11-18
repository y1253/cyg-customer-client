import { useEffect, useState } from 'react'
import { TAX_KIND_LABEL, type RateMode, type TaxAgency, type TaxAgencyInput, type TaxKind } from '@/api/bookkeeping'
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
import { Switch } from '@/components/ui/switch'
import { useCreateAccount } from '@/hooks/useCreateAccount'
import { useSaveAgency } from '@/hooks/useSaveAgency'
import { useSaveSplitGroup } from '@/hooks/useSplitGroups'
import { useTax } from '@/hooks/useTax'
import { categoryChoice, choiceReady, resolveChoice, type CategoryChoice } from '@/lib/categoryChoice'
import { cn } from '@/lib/utils'
import { CategoryField } from './CategoryField'

const KINDS: TaxKind[] = ['SALES', 'PURCHASE']

type RateForm = { on: boolean; mode: RateMode; value: string }

const EMPTY: Record<TaxKind, RateForm> = {
  SALES: { on: true, mode: 'PERCENT', value: '' },
  PURCHASE: { on: false, mode: 'PERCENT', value: '' },
}

const rateOf = (agency: TaxAgency, kind: TaxKind): RateForm => {
  const r = agency.rates.find((x) => x.kind === kind)
  if (!r) return { on: false, mode: 'PERCENT', value: '' }
  return { on: true, mode: r.mode, value: String(r.mode === 'FIXED' ? (r.amount ?? '') : r.rate) }
}

/** The group Select's value for "New group…". */
const NEW_GROUP = 'new'

const HINT: Record<TaxKind, string> = {
  SALES: 'Money you receive',
  PURCHASE: 'Money you spend',
}

/**
 * step9 part 4 (2026-11-15): add or edit a SPLIT RULE (was a tax agency) — an In rate, an Out rate or both, each
 * a percentage (included in the amount) or a fixed amount, and where its splits go: its own account (the
 * default) or a category picked by hand. `agency` = edit it; null = a new one.
 *
 * step9 (2026-11-17): a rule is INDIVIDUAL (cuts what the rules before it left) or in a SPLIT GROUP (its rules cut
 * the same amount together and are picked as one) — an existing group or a new one made on save. `groupId` = the
 * group a new rule starts in.
 */
export function AgencyDialog({
  open,
  onOpenChange,
  agency,
  title,
  description,
  onSaved,
  groupId = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  agency: TaxAgency | null
  title?: string
  description?: string
  onSaved?: (agency: TaxAgency) => void
  groupId?: number | null
}) {
  const save = useSaveAgency()
  const saveGroup = useSaveSplitGroup()
  const create = useCreateAccount()
  const groups = useTax().data?.groups ?? []
  /** Individual or in a group; `group` = a group id as text, or NEW_GROUP. */
  const [inGroup, setInGroup] = useState(false)
  const [group, setGroup] = useState<string | null>(null)
  const [newGroup, setNewGroup] = useState('')
  const [name, setName] = useState('')
  /** Per direction: whether the rule takes it, % or $, and the value as typed. */
  const [rates, setRates] = useState<Record<TaxKind, RateForm>>(EMPTY)
  /** Its own category; off = its own account. */
  const [ownCategory, setOwnCategory] = useState(false)
  const [choice, setChoice] = useState<CategoryChoice>(categoryChoice(null))
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // A fresh form every time it opens.
  useEffect(() => {
    if (!open) return
    setName(agency?.name ?? '')
    setRates(agency ? { SALES: rateOf(agency, 'SALES'), PURCHASE: rateOf(agency, 'PURCHASE') } : EMPTY)
    setOwnCategory(!!agency?.category)
    setChoice(categoryChoice(agency?.category ?? null))
    setActive(agency?.active ?? true)
    const startGroup = agency ? agency.groupId : groupId
    setInGroup(startGroup !== null)
    setGroup(startGroup !== null ? String(startGroup) : null)
    setNewGroup('')
    setError(null)
    save.reset()
    saveGroup.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agency])

  const setRate = (kind: TaxKind, patch: Partial<RateForm>) => setRates((r) => ({ ...r, [kind]: { ...r[kind], ...patch } }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Give the split rule a name.')
    const chosen = KINDS.filter((k) => rates[k].on)
    if (!chosen.length) return setError('Give the split rule an In rate, an Out rate, or both.')
    for (const k of chosen) {
      const value = Number(rates[k].value)
      const label = TAX_KIND_LABEL[k]
      if (rates[k].value.trim() === '' || !Number.isFinite(value)) return setError(`Fill in the ${label} rate.`)
      if (rates[k].mode === 'PERCENT' && (value < 0 || value > 100))
        return setError(`The ${label} rate is a percent between 0 and 100.`)
      if (rates[k].mode === 'FIXED' && value <= 0) return setError(`The ${label} amount must be more than 0.`)
    }
    if (ownCategory && !choiceReady(choice)) return setError('Pick the category, or switch "Its own category" off.')
    if (inGroup && !group) return setError('Pick the group, or make it an individual rule.')
    if (inGroup && group === NEW_GROUP && !newGroup.trim()) return setError('Give the new group a name.')
    setError(null)
    let targetGroup: number | null = null
    if (inGroup && group === NEW_GROUP) {
      try {
        targetGroup = (await saveGroup.mutateAsync({ name: newGroup.trim() })).id
      } catch {
        return
      }
      // Made once: a second Save (if the rule fails) uses it.
      setGroup(String(targetGroup))
    } else if (inGroup) targetGroup = Number(group)
    const category = ownCategory ? await resolveChoice(choice, create) : null
    if (ownCategory && !category) return setError('The new category could not be made.')
    const values: TaxAgencyInput = {
      name: name.trim(),
      rates: chosen.map((kind) => {
        const value = Number(rates[kind].value)
        return rates[kind].mode === 'FIXED'
          ? { kind, mode: 'FIXED' as const, amount: Math.round(value * 100) / 100 }
          : { kind, mode: 'PERCENT' as const, rate: Math.round(value * 1000) / 1000 }
      }),
      category,
      active,
      groupId: targetGroup,
    }
    save.mutate(
      { ...values, id: agency?.id },
      {
        onSuccess: (saved) => {
          onSaved?.(saved)
          onOpenChange(false)
        },
      },
    )
  }

  const message = error ?? saveGroup.error?.message ?? save.error?.message

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>{title ?? (agency ? 'Edit split rule' : 'Add a split rule')}</DialogTitle>
            <DialogDescription>
              {description ??
                "Picking it for a name splits that name's transactions once — you can change those splits afterwards like any other. New transactions of the name are split when they come in."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-w-0 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="agency-name">Name</Label>
              <Input
                id="agency-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. GST"
                maxLength={191}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label>Rates</Label>
              {KINDS.map((kind) => (
                <div key={kind} className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
                  <Switch
                    checked={rates[kind].on}
                    onCheckedChange={(on) => setRate(kind, { on })}
                    className="data-checked:bg-brand"
                    aria-label={TAX_KIND_LABEL[kind]}
                  />
                  <span className="min-w-24 flex-1">
                    <span className="block text-sm font-medium">{TAX_KIND_LABEL[kind]}</span>
                    <span className="block text-xs text-muted-foreground">{HINT[kind]}</span>
                  </span>
                  <div
                    role="group"
                    aria-label={`${TAX_KIND_LABEL[kind]}: percentage or fixed amount`}
                    className="flex rounded-md bg-white p-0.5 ring-1 ring-black/10"
                  >
                    {(['PERCENT', 'FIXED'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        disabled={!rates[kind].on}
                        onClick={() => setRate(kind, { mode })}
                        className={cn(
                          'rounded px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50',
                          rates[kind].mode === mode ? 'bg-brand text-white' : 'text-muted-foreground hover:bg-muted',
                        )}
                      >
                        {mode === 'PERCENT' ? '%' : '$'}
                      </button>
                    ))}
                  </div>
                  <div className="relative w-24">
                    {rates[kind].mode === 'FIXED' && (
                      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                        $
                      </span>
                    )}
                    <Input
                      inputMode="decimal"
                      value={rates[kind].value}
                      disabled={!rates[kind].on}
                      onChange={(e) => setRate(kind, { value: e.target.value })}
                      placeholder={rates[kind].mode === 'FIXED' ? '2.00' : '5'}
                      className={cn('bg-white', rates[kind].mode === 'FIXED' ? 'pl-6' : 'pr-7')}
                      aria-label={`${TAX_KIND_LABEL[kind]} ${rates[kind].mode === 'FIXED' ? 'amount' : 'rate'}`}
                    />
                    {rates[kind].mode === 'PERCENT' && (
                      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                        %
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                A percentage is taken out of the amount: $100 at 10% leaves $90.91 and splits off $9.09.
              </p>
            </div>
            <div className="grid gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-medium">Type</span>
                  <span className="block text-xs text-muted-foreground">
                    {inGroup
                      ? 'The rules of a group split the same amount together, and are picked on a name as one.'
                      : 'Splits what the rules before it left.'}
                  </span>
                </span>
                <div role="group" aria-label="Individual or group" className="flex rounded-md bg-white p-0.5 ring-1 ring-black/10">
                  {([false, true] as const).map((g) => (
                    <button
                      key={String(g)}
                      type="button"
                      onClick={() => setInGroup(g)}
                      className={cn(
                        'rounded px-2 py-0.5 text-xs font-medium transition-colors',
                        inGroup === g ? 'bg-brand text-white' : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {g ? 'Group' : 'Individual'}
                    </button>
                  ))}
                </div>
              </div>
              {inGroup && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select value={group} onValueChange={(v) => setGroup(v)}>
                    <SelectTrigger className="h-9 w-full bg-white" aria-label="Group">
                      <SelectValue placeholder="Pick a group">
                        {(v: string | null) =>
                          v === NEW_GROUP ? 'New group…' : (groups.find((g) => String(g.id) === v)?.name ?? 'Pick a group')
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>
                          {g.name}
                        </SelectItem>
                      ))}
                      <SelectItem value={NEW_GROUP}>New group…</SelectItem>
                    </SelectContent>
                  </Select>
                  {group === NEW_GROUP && (
                    <Input
                      value={newGroup}
                      onChange={(e) => setNewGroup(e.target.value)}
                      placeholder="e.g. Quebec taxes"
                      maxLength={191}
                      className="bg-white"
                      aria-label="New group name"
                    />
                  )}
                </div>
              )}
            </div>
            <div className="grid gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
              <label className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-medium">Its own category</span>
                  <span className="block text-xs text-muted-foreground">
                    {ownCategory
                      ? 'The splits go to this category.'
                      : `Off: the splits go to its own account, “${name.trim() || 'the rule’s name'}”.`}
                  </span>
                </span>
                <Switch checked={ownCategory} onCheckedChange={setOwnCategory} className="data-checked:bg-brand" />
              </label>
              {ownCategory && <CategoryField value={choice} onChange={setChoice} />}
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
              <span>
                <span className="block text-sm font-medium">Active</span>
                <span className="block text-xs text-muted-foreground">Only active rules split new transactions.</span>
              </span>
              <Switch checked={active} onCheckedChange={setActive} className="data-checked:bg-brand" />
            </label>
            {message && (
              <p role="alert" className="text-sm text-destructive">
                {message}
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={save.isPending || create.isPending || saveGroup.isPending} className="bg-brand text-white hover:bg-brand/85">
              {save.isPending ? 'Saving…' : agency ? 'Save' : 'Add split rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
