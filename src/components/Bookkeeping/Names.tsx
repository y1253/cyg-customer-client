import { useMemo, useState } from 'react'
import {
  ChevronDown,
  CircleDashed,
  CircleHelp,
  Landmark,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Store,
  Trash2,
  UserRound,
} from 'lucide-react'
import {
  TAX_KIND_LABEL,
  type LedgerName,
  type NameRuleRef,
  type NameType,
  type TaxAgency,
  type UnrecognizedName,
} from '@/api/bookkeeping'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { useDeleteAgency } from '@/hooks/useDeleteAgency'
import { useNameAgencies } from '@/hooks/useNameAgencies'
import { useNames } from '@/hooks/useNames'
import { useResetNameRule } from '@/hooks/useNameRule'
import { useSaveAgency } from '@/hooks/useSaveAgency'
import { useTax } from '@/hooks/useTax'
import { cn } from '@/lib/utils'
import { AgencyDialog } from './AgencyDialog'
import { NameRuleDialog, type NameRuleTarget } from './NameRuleDialog'

const pct = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 3 })}%`

type Filter = 'ALL' | 'AGENCY' | 'UNRECOGNIZED' | NameType

const TYPE_LABEL: Record<NameType | 'AGENCY', string> = {
  AGENCY: 'Tax agency',
  SUPPLIER: 'Supplier',
  CUSTOMER: 'Customer',
  OTHER: 'Other',
}

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'SUPPLIER', label: 'Suppliers' },
  { id: 'CUSTOMER', label: 'Customers' },
  { id: 'AGENCY', label: 'Tax agencies' },
  { id: 'OTHER', label: 'Other' },
  { id: 'UNRECOGNIZED', label: 'Unrecognized' },
]

const TYPE_ICON: Record<NameType | 'AGENCY', typeof Landmark> = {
  AGENCY: Landmark,
  SUPPLIER: Store,
  CUSTOMER: UserRound,
  OTHER: CircleDashed,
}

const TYPE_BADGE: Record<NameType | 'AGENCY', string> = {
  AGENCY: 'bg-amber-100 text-amber-800',
  SUPPLIER: 'bg-sky-100 text-sky-800',
  CUSTOMER: 'bg-emerald-100 text-emerald-800',
  OTHER: 'bg-muted text-muted-foreground',
}

function TypeIcon({ type }: { type: NameType | 'AGENCY' }) {
  const Icon = TYPE_ICON[type]
  return (
    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', TYPE_BADGE[type])}>
      <Icon className="size-4" />
    </span>
  )
}

/**
 * The Names tab: every name on the ledger with its type — the tax agencies (rates, Active
 * switch, edit, delete), every payee the AI read (category, the agencies that tax it, and
 * Edit to rename or re-categorise it), and "Unclarified name": the rows the AI could NOT
 * name, listed like a name, each of its descriptions assignable once. Click a name for its
 * ledger. Edits are the customer's own rules: applied to their ledger at once and to every
 * statement they upload from now on. A name is untaxed until agencies are picked for it.
 */
export function Names({ onOpenName }: { onOpenName?: (name: string) => void }) {
  const tax = useTax()
  const names = useNames()
  const save = useSaveAgency()
  const remove = useDeleteAgency()
  const setNameTax = useNameAgencies()
  const resetRule = useResetNameRule()
  const [ruleTarget, setRuleTarget] = useState<NameRuleTarget | null>(null)
  const [editing, setEditing] = useState<TaxAgency | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirm, setConfirm] = useState<TaxAgency | null>(null)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [query, setQuery] = useState('')

  const allAgencies = tax.data?.agencies ?? []
  const q = query.trim().toLowerCase()
  const agencies = useMemo(
    () => (tax.data?.agencies ?? []).filter((a) => !q || a.name.toLowerCase().includes(q)),
    [tax.data, q],
  )
  const payees = useMemo(
    () =>
      (names.data?.names ?? []).filter(
        (n) => !q || n.name.toLowerCase().includes(q) || n.category.toLowerCase().includes(q),
      ),
    [names.data, q],
  )
  const unrecognized = useMemo(
    () =>
      (names.data?.unrecognized ?? []).filter(
        (u) =>
          !q ||
          u.sampleDescription.toLowerCase().includes(q) ||
          u.category.toLowerCase().includes(q),
      ),
    [names.data, q],
  )
  const count = (f: Filter) =>
    f === 'ALL'
      ? agencies.length + payees.length
      : f === 'AGENCY'
        ? agencies.length
        : f === 'UNRECOGNIZED'
          ? unrecognized.length
          : payees.filter((n) => n.type === f).length
  const shownAgencies = filter === 'ALL' || filter === 'AGENCY' ? agencies : []
  const shownNames =
    filter === 'ALL'
      ? payees
      : filter === 'AGENCY' || filter === 'UNRECOGNIZED'
        ? []
        : payees.filter((n) => n.type === filter)
  // In "All" the nameless rows are the Unclarified name entry (its descriptions under it).
  const shownUnrecognized = filter === 'UNRECOGNIZED' ? unrecognized : []
  const resetting = (rule: NameRuleRef | null) =>
    !!rule &&
    resetRule.isPending &&
    resetRule.variables?.matchType === rule.matchType &&
    resetRule.variables?.matchKey === rule.matchKey

  const open = (agency: TaxAgency | null) => {
    setEditing(agency)
    setDialogOpen(true)
  }
  const loading = tax.isLoading || names.isLoading
  const error = tax.error ?? names.error ?? save.error ?? setNameTax.error ?? resetRule.error

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-[#0B1C2C]">Names</h2>
          <p className="text-sm text-muted-foreground">
            Every name on your ledger — click one for its transactions. Edit a name or category and it is saved to
            your account, for this ledger and every statement you upload from now on. A name is taxed only by the
            agencies you pick for it.
          </p>
        </div>
        <Button onClick={() => open(null)} className="h-10 gap-2 rounded-lg bg-brand px-4 text-white hover:bg-brand/85">
          <Plus className="size-4" />
          Add agency
        </Button>
      </div>

      <div className="flex flex-col gap-3 border-b px-5 py-3 sm:flex-row sm:items-center">
        <div className="relative w-full shrink-0 sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or category"
            className="h-9 pl-9"
          />
        </div>
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                filter === f.id
                  ? 'bg-[#0B1C2C] text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              )}
            >
              {f.label} <span className="opacity-70 tabular-nums">{count(f.id)}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 p-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : !shownAgencies.length && !shownNames.length && !shownUnrecognized.length ? (
        <div className="px-6 py-14 text-center">
          <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Landmark className="size-5" />
          </span>
          <p className="font-medium text-[#0B1C2C]">{q || filter !== 'ALL' ? 'Nothing matches' : 'No names yet'}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {q || filter !== 'ALL'
              ? 'Try another search or type.'
              : 'Names appear here once your statements are read. Add a tax agency — e.g. “GST”, sales 5%, purchase 5% — to post its tax under every taxable transaction.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y">
          {shownAgencies.map((a) => (
            <li key={`a:${a.id}`} className={cn('flex items-center gap-4 px-5 py-3.5', !a.active && 'opacity-60')}>
              <TypeIcon type="AGENCY" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[#0B1C2C]">{a.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <Badge className={TYPE_BADGE.AGENCY}>{TYPE_LABEL.AGENCY}</Badge>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {a.rates.map((r) => `${TAX_KIND_LABEL[r.kind]} ${pct(r.rate)}`).join(' · ')}
                  </span>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="hidden sm:inline">{a.active ? 'Active' : 'Off'}</span>
                <Switch
                  checked={a.active}
                  disabled={save.isPending}
                  onCheckedChange={(active) => save.mutate({ id: a.id, active })}
                  className="data-checked:bg-brand"
                  aria-label={`${a.name} active`}
                />
              </label>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon-sm" title="Edit" onClick={() => open(a)}>
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Delete"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirm(a)}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
          {shownNames.map((n) => (
            <NameRow
              key={`n:${n.name}`}
              n={n}
              agencies={allAgencies}
              pending={setNameTax.isPending && setNameTax.variables?.name === n.name}
              onAgencies={(agencyIds) => setNameTax.mutate({ name: n.name, agencyIds })}
              onOpen={onOpenName && (() => onOpenName(n.name))}
              onEdit={() => setRuleTarget({ kind: 'name', view: n })}
              onReset={() => n.rule && resetRule.mutate(n.rule)}
              resetting={resetting(n.rule)}
              unrecognized={n.unclarified ? (names.data?.unrecognized ?? []) : undefined}
              onAssign={(u) => setRuleTarget({ kind: 'unrecognized', view: u })}
            />
          ))}
          {shownUnrecognized.map((u) => (
            <UnrecognizedRow
              key={`u:${u.key}`}
              u={u}
              onAssign={() => setRuleTarget({ kind: 'unrecognized', view: u })}
              onReset={() => u.rule && resetRule.mutate(u.rule)}
              resetting={resetting(u.rule)}
            />
          ))}
        </ul>
      )}
      {error && <p className="px-5 pb-4 text-sm text-destructive">{error.message}</p>}

      <AgencyDialog open={dialogOpen} onOpenChange={setDialogOpen} agency={editing} />
      <NameRuleDialog target={ruleTarget} onOpenChange={(o) => !o && setRuleTarget(null)} />

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {confirm?.name}?</DialogTitle>
            <DialogDescription>
              Its tax lines leave your ledger at once, and the names it taxed lose it. To pause it instead, switch it off.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => confirm && remove.mutate(confirm.id, { onSuccess: () => setConfirm(null) })}
            >
              {remove.isPending ? 'Deleting…' : 'Delete agency'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * A payee. "Other" names (transfers, loans, owner money) are never taxed: no agencies. The
 * Unclarified name entry (the rows with no name) lists its descriptions, each with Assign,
 * and cannot be renamed itself.
 */
function NameRow({
  n,
  agencies,
  pending,
  onAgencies,
  onOpen,
  onEdit,
  onReset,
  resetting,
  unrecognized,
  onAssign,
}: {
  n: LedgerName
  agencies: TaxAgency[]
  pending: boolean
  onAgencies: (agencyIds: number[]) => void
  onOpen?: () => void
  onEdit: () => void
  onReset: () => void
  resetting: boolean
  unrecognized?: UnrecognizedName[]
  onAssign: (u: UnrecognizedName) => void
}) {
  const [open, setOpen] = useState(false)
  const many = n.descriptions.length
  const taxable = n.type !== 'OTHER' || !!n.unclarified
  return (
    <li className="px-5 py-3">
      <div className="flex items-center gap-4">
      {n.unclarified ? (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700">
          <CircleHelp className="size-4" />
        </span>
      ) : (
        <TypeIcon type={n.type} />
      )}
      <div className="min-w-0 flex-1">
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            title={`See every transaction of ${n.name}`}
            className={cn(
              'max-w-full truncate text-left font-medium text-[#0B1C2C] hover:text-brand hover:underline',
              n.unclarified && 'italic',
            )}
          >
            {n.name}
          </button>
        ) : (
          <p className="truncate font-medium text-[#0B1C2C]">{n.name}</p>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {n.unclarified ? (
            <Badge className="bg-orange-100 text-orange-800">Unrecognized</Badge>
          ) : (
            <Badge className={TYPE_BADGE[n.type]}>{TYPE_LABEL[n.type]}</Badge>
          )}
          {n.rule && <Badge className="bg-brand/10 text-brand">Edited</Badge>}
          <span className="truncate text-sm text-muted-foreground">
            {n.category}
            {n.otherCategories > 0 && ` +${n.otherCategories} more`}
          </span>
          <span className="text-xs text-muted-foreground/80 tabular-nums">
            · {n.rows.toLocaleString()} row{n.rows === 1 ? '' : 's'}
          </span>
        </div>
        {many > 0 && (
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="shrink-0 text-muted-foreground/70">Descriptions:</span>
            <span className="min-w-0 truncate" title={n.descriptions.map((d) => d.description).join('\n')}>
              {n.descriptions
                .slice(0, 2)
                .map((d) => d.description)
                .join(' · ')}
            </span>
            {many > 2 && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="shrink-0 font-medium text-brand hover:underline"
              >
                +{many - 2} more
              </button>
            )}
          </p>
        )}
      </div>
      {taxable && agencies.length > 0 && (
        <AgencyPicker name={n.name} type={n.type} agencies={agencies} picked={n.agencyIds} pending={pending} onChange={onAgencies} />
      )}
      <div className="flex shrink-0 gap-1">
        {many > 0 && (
          <Button
            variant="ghost"
            size="icon-sm"
            title={open ? 'Hide descriptions' : 'Show the descriptions under this name'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
          </Button>
        )}
        {!n.unclarified && (
          <Button variant="ghost" size="icon-sm" title={`Edit ${n.name}`} onClick={onEdit}>
            <Pencil />
          </Button>
        )}
        {n.rule && <ResetButton onReset={onReset} resetting={resetting} />}
      </div>
      </div>
      {open && unrecognized && (
        <ul className="mt-2 ml-13 flex flex-col gap-1 rounded-lg bg-muted/40 p-2">
          {unrecognized.map((u) => (
            <li key={u.key} className="flex items-center gap-3 px-2 py-1 text-sm">
              <span className="min-w-0 flex-1 truncate text-[#0B1C2C]" title={u.sampleDescription}>
                {u.sampleDescription}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{u.category}</span>
              <span className="w-14 shrink-0 text-right text-xs text-muted-foreground/80 tabular-nums">
                {u.rows.toLocaleString()} row{u.rows === 1 ? '' : 's'}
              </span>
              <Button variant="outline" size="xs" onClick={() => onAssign(u)}>
                Assign
              </Button>
            </li>
          ))}
        </ul>
      )}
      {open && !unrecognized && (
        <ul className="mt-2 ml-13 flex flex-col gap-1 rounded-lg bg-muted/40 p-2">
          {n.descriptions.map((d) => (
            <li key={d.description} className="flex items-center gap-3 px-2 py-1 text-sm">
              <span className="min-w-0 flex-1 truncate text-[#0B1C2C]" title={d.description}>
                {d.description}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{d.category}</span>
              <span className="w-14 shrink-0 text-right text-xs text-muted-foreground/80 tabular-nums">
                {d.rows.toLocaleString()} row{d.rows === 1 ? '' : 's'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/**
 * The agencies that tax one name: a chip with what is picked ("No tax" by default), opening
 * a list with a switch per agency. A Customer name pays each agency's sales rate, a Supplier
 * its purchase rate — an agency with no rate of that kind is shown but cannot tax it.
 */
function AgencyPicker({
  name,
  type,
  agencies,
  picked,
  pending,
  onChange,
}: {
  name: string
  type: NameType
  agencies: TaxAgency[]
  picked: number[]
  pending: boolean
  onChange: (agencyIds: number[]) => void
}) {
  const kind = type === 'CUSTOMER' ? 'SALES' : type === 'SUPPLIER' ? 'PURCHASE' : null
  const chosen = agencies.filter((a) => picked.includes(a.id))
  return (
    <Popover>
      <PopoverTrigger
        disabled={pending}
        title={`Which taxes apply to ${name}`}
        className={cn(
          'inline-flex max-w-44 shrink-0 items-center gap-1 truncate rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors',
          chosen.length
            ? 'bg-amber-50 text-amber-800 ring-amber-600/20 hover:bg-amber-100'
            : 'text-muted-foreground ring-black/10 hover:bg-muted',
        )}
      >
        <Landmark className="size-3.5 shrink-0" />
        <span className="truncate">{chosen.length ? chosen.map((a) => a.name).join(', ') : 'No tax'}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <p className="text-xs font-medium text-muted-foreground">Taxes on {name}</p>
        <ul className="flex flex-col gap-1">
          {agencies.map((a) => {
            const rate = kind ? a.rates.find((r) => r.kind === kind) : a.rates[0]
            const on = picked.includes(a.id)
            return (
              <li key={a.id}>
                <label className={cn('flex items-center gap-2.5 rounded-md px-1.5 py-1 text-sm', !a.active && 'opacity-60')}>
                  <Switch
                    checked={on}
                    disabled={pending}
                    onCheckedChange={(v) => onChange(v ? [...picked, a.id] : picked.filter((id) => id !== a.id))}
                    className="data-checked:bg-brand"
                  />
                  <span className="min-w-0 flex-1 truncate">{a.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {rate ? `${TAX_KIND_LABEL[rate.kind]} ${pct(rate.rate)}` : kind ? `no ${TAX_KIND_LABEL[kind].toLowerCase()} rate` : ''}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

/** Rows the AI found no name for: one line per description, to assign once. */
function UnrecognizedRow({
  u,
  onAssign,
  onReset,
  resetting,
}: {
  u: UnrecognizedName
  onAssign: () => void
  onReset: () => void
  resetting: boolean
}) {
  return (
    <li className="flex items-center gap-4 px-5 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700">
        <CircleHelp className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[#0B1C2C]" title={u.sampleDescription}>
          {u.sampleDescription}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <Badge className="bg-orange-100 text-orange-800">Unrecognized</Badge>
          {u.rule && <Badge className="bg-brand/10 text-brand">Edited</Badge>}
          <span className="truncate text-sm text-muted-foreground">
            {u.category}
            {u.otherCategories > 0 && ` +${u.otherCategories} more`}
          </span>
          <span className="text-xs text-muted-foreground/80 tabular-nums">
            · {u.rows.toLocaleString()} row{u.rows === 1 ? '' : 's'}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="outline" size="sm" onClick={onAssign}>
          Assign
        </Button>
        {u.rule && <ResetButton onReset={onReset} resetting={resetting} />}
      </div>
    </li>
  )
}

/** Remove the customer's own change: the rows go back to the default. */
function ResetButton({ onReset, resetting }: { onReset: () => void; resetting: boolean }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      title="Reset to default"
      disabled={resetting}
      onClick={onReset}
      className="text-muted-foreground"
    >
      <RotateCcw />
    </Button>
  )
}
