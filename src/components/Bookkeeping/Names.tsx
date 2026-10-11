import { useMemo, useState } from 'react'
import { CircleDashed, Landmark, Pencil, Plus, Search, Store, Trash2, UserRound } from 'lucide-react'
import { TAX_KIND_LABEL, type LedgerName, type NameType, type TaxAgency } from '@/api/bookkeeping'
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
import { Switch } from '@/components/ui/switch'
import { useDeleteAgency } from '@/hooks/useDeleteAgency'
import { useNames } from '@/hooks/useNames'
import { useSaveAgency } from '@/hooks/useSaveAgency'
import { useTax } from '@/hooks/useTax'
import { useUpdateName } from '@/hooks/useUpdateName'
import { cn } from '@/lib/utils'
import { AgencyDialog } from './AgencyDialog'

const pct = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 3 })}%`

type Filter = 'ALL' | 'AGENCY' | NameType

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
 * switch, edit, delete) and every payee the AI read (category, and a switch that keeps
 * its rows out of tax, applied at once — no Generate).
 */
export function Names() {
  const tax = useTax()
  const names = useNames()
  const save = useSaveAgency()
  const remove = useDeleteAgency()
  const setNameTax = useUpdateName()
  const [editing, setEditing] = useState<TaxAgency | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirm, setConfirm] = useState<TaxAgency | null>(null)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [query, setQuery] = useState('')

  const taxOn = !!tax.data?.enabled
  const q = query.trim().toLowerCase()
  const agencies = useMemo(
    () => (tax.data?.agencies ?? []).filter((a) => !q || a.name.toLowerCase().includes(q)),
    [tax.data, q],
  )
  const payees = useMemo(
    () =>
      (names.data ?? []).filter(
        (n) => !q || n.name.toLowerCase().includes(q) || n.category.toLowerCase().includes(q),
      ),
    [names.data, q],
  )
  const count = (f: Filter) =>
    f === 'ALL' ? agencies.length + payees.length : f === 'AGENCY' ? agencies.length : payees.filter((n) => n.type === f).length
  const shownAgencies = filter === 'ALL' || filter === 'AGENCY' ? agencies : []
  const shownNames = filter === 'ALL' ? payees : filter === 'AGENCY' ? [] : payees.filter((n) => n.type === filter)

  const open = (agency: TaxAgency | null) => {
    setEditing(agency)
    setDialogOpen(true)
  }
  const loading = tax.isLoading || names.isLoading
  const error = tax.error ?? names.error ?? save.error ?? setNameTax.error

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-[#0B1C2C]">Names</h2>
          <p className="text-sm text-muted-foreground">
            {tax.data && !taxOn
              ? 'Sales tax is off — switch it on in Overview to add tax to your ledger.'
              : 'Every name on your ledger. Switch tax off for a name and its tax lines leave the ledger right away.'}
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
      ) : !shownAgencies.length && !shownNames.length ? (
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
              taxOn={taxOn}
              pending={setNameTax.isPending && setNameTax.variables?.name === n.name}
              onTax={(applies) => setNameTax.mutate({ name: n.name, taxExempt: !applies })}
            />
          ))}
        </ul>
      )}
      {error && <p className="px-5 pb-4 text-sm text-destructive">{error.message}</p>}

      <AgencyDialog open={dialogOpen} onOpenChange={setDialogOpen} agency={editing} />

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {confirm?.name}?</DialogTitle>
            <DialogDescription>
              Its tax lines leave your ledger the next time you click Generate. To pause it instead, switch it off.
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

/** A payee. "Other" names (transfers, loans, owner money) are never taxed: no switch. */
function NameRow({
  n,
  taxOn,
  pending,
  onTax,
}: {
  n: LedgerName
  taxOn: boolean
  pending: boolean
  onTax: (applies: boolean) => void
}) {
  return (
    <li className="flex items-center gap-4 px-5 py-3">
      <TypeIcon type={n.type} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[#0B1C2C]">{n.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <Badge className={TYPE_BADGE[n.type]}>{TYPE_LABEL[n.type]}</Badge>
          <span className="truncate text-sm text-muted-foreground">
            {n.category}
            {n.otherCategories > 0 && ` +${n.otherCategories} more`}
          </span>
          <span className="text-xs text-muted-foreground/80 tabular-nums">
            · {n.rows.toLocaleString()} row{n.rows === 1 ? '' : 's'}
          </span>
        </div>
      </div>
      {taxOn && n.type !== 'OTHER' && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{n.taxExempt ? 'No tax' : 'Tax applies'}</span>
          <Switch
            checked={!n.taxExempt}
            disabled={pending}
            onCheckedChange={onTax}
            className="data-checked:bg-brand"
            aria-label={`Tax applies to ${n.name}`}
          />
        </label>
      )}
    </li>
  )
}
