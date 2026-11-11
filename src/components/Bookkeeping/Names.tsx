import { useMemo, useState, type ReactNode } from 'react'
import {
  Check,
  ChevronDown,
  CircleDashed,
  CircleHelp,
  Landmark,
  ListFilter,
  CreditCard,
  Inbox,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Store,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import {
  TAX_KIND_LABEL,
  ruleConflictOf,
  type ContainsRule,
  type LedgerName,
  type NameGroup,
  type NameRuleRef,
  type NameType,
  type TaxAgency,
  type UnrecognizedName,
  type Statement,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { useDeleteAgency } from '@/hooks/useDeleteAgency'
import { useNameAgencies } from '@/hooks/useNameAgencies'
import { useNames } from '@/hooks/useNames'
import { useAttachments } from '@/hooks/useAttachments'
import { useAddName } from '@/hooks/useNameFiles'
import {
  accountEntries,
  countsByName,
  EMPTY_COUNTS,
  nameKey,
  UNSORTED,
  type BucketCounts,
  type BucketFilter,
} from '@/lib/name-files'
import { useResetNameRule, useSaveNameRule } from '@/hooks/useNameRule'
import { useDeleteNameGroup, useNameSearch, useSaveNameGroup, useSetNameGroup } from '@/hooks/useNameGroups'
import { useSaveAgency } from '@/hooks/useSaveAgency'
import { useTax } from '@/hooks/useTax'
import { useMergeNames } from '@/hooks/useMerge'
import { useRuleConflict } from '@/hooks/useRuleConflict'
import { money } from '@/lib/money'
import { cn } from '@/lib/utils'
import { AgencyDialog } from './AgencyDialog'
import { AgencyPicker } from './AgencyPicker'
import { ContainsRuleDialog } from './ContainsRuleDialog'
import { InlineRename } from './InlineRename'
import { FIELD_KIND_ICON, FIELD_KIND_LABEL, fieldHref } from '@/lib/name-fields'
import { NameRuleDialog, type NameRuleTarget } from './NameRuleDialog'
import { RuleConflictDialog } from './RuleConflictDialog'
import { UnclarifiedTable } from './UnclarifiedTable'
import { descriptionDragProps, nameDragProps, useGroupDrop, useNameDrop } from './name-drag'
import { FolderButton } from './NameFiles/FileCounts'
import { FilesDialog, type FilesTarget } from './NameFiles/FilesDialog'

const pct = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 3 })}%`

/** What a name's rows add up to, red when money went out — as the ledger colours amounts. */
function Total({ total }: { total: number }) {
  return (
    <span
      className={cn('text-xs font-medium tabular-nums', total < 0 ? 'text-red-600' : 'text-emerald-700')}
      title="Total of its transactions"
    >
      · {money(total)}
    </span>
  )
}

/** What the list shows: everything, the agencies, the nameless rows, or one group (its key). */
type Filter = 'ALL' | 'AGENCY' | 'UNRECOGNIZED' | string

const TYPE_LABEL: Record<NameType | 'AGENCY', string> = {
  AGENCY: 'Tax agency',
  SUPPLIER: 'Supplier',
  CUSTOMER: 'Customer',
  OTHER: 'Other',
}

/** step9: the built-in groups, until the server's list arrives. */
const BUILTIN_GROUPS: NameGroup[] = [
  { key: 'SUPPLIER', label: 'Suppliers' },
  { key: 'CUSTOMER', label: 'Customers' },
  { key: 'OTHER', label: 'Other' },
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
/** A group the customer made ("Employees"). */
const OWN_GROUP_BADGE = 'bg-violet-100 text-violet-800'

const isBuiltin = (group: string): group is NameType => group in TYPE_ICON && group !== 'AGENCY'

function TypeIcon({ type }: { type: NameType | 'AGENCY' | string }) {
  const Icon = isBuiltin(type) || type === 'AGENCY' ? TYPE_ICON[type as NameType | 'AGENCY'] : Users
  const badge = isBuiltin(type) || type === 'AGENCY' ? TYPE_BADGE[type as NameType | 'AGENCY'] : OWN_GROUP_BADGE
  return (
    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', badge)}>
      <Icon className="size-4" />
    </span>
  )
}

/** The id a name's row carries, so an exception link can scroll to it. */
const rowId = (name: string) => `name-row-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

/**
 * The Names tab: every name on the ledger — the tax agencies (rates, Active switch, edit,
 * delete), then every payee the AI read, in its GROUP (step9: Suppliers, Customers, Other or
 * one of the customer's own, such as Employees — drag a name onto a group to move it), and
 * "Unclarified name": the rows the AI could NOT name. Each name lists the bank descriptions
 * it follows (drag one onto another name to move it there) and its exceptions. The search
 * finds a name by its name, category or bank description. Click a name for its ledger.
 * Edits are the customer's own rules: applied at once and to every statement from now on.
 */
export function Names({
  onOpenName,
  statements = [],
  onViewTransaction,
  onOpenStatement,
}: {
  onOpenName?: (name: string) => void
  /** step2 (2026-11-11): the book's statements — each bank account is an entry holding them. */
  statements?: Statement[]
  /** A file's "View transaction". */
  onViewTransaction?: (transactionId: number) => void
  /** A statement clicked in a bank account's folder: its transactions. */
  onOpenStatement?: (statementId: number) => void
}) {
  const tax = useTax()
  const names = useNames()
  // step2 (2026-11-11): every file lives in a name's folder — the counts per name.
  const attachments = useAttachments()
  const fileCounts = useMemo(() => countsByName(attachments.data ?? []), [attachments.data])
  const accounts = useMemo(() => accountEntries(statements), [statements])
  const [files, setFiles] = useState<FilesTarget | null>(null)
  const [adding, setAdding] = useState(false)
  const unsorted = fileCounts.get(UNSORTED) ?? EMPTY_COUNTS
  const save = useSaveAgency()
  const remove = useDeleteAgency()
  const setNameTax = useNameAgencies()
  const resetRule = useResetNameRule()
  const saveRule = useSaveNameRule()
  const conflict = useRuleConflict()
  const setGroup = useSetNameGroup()
  const saveGroup = useSaveNameGroup()
  const deleteGroup = useDeleteNameGroup()
  const [ruleTarget, setRuleTarget] = useState<NameRuleTarget | null>(null)
  const [editing, setEditing] = useState<TaxAgency | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirm, setConfirm] = useState<TaxAgency | null>(null)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [query, setQuery] = useState('')
  const [containsOpen, setContainsOpen] = useState(false)
  const [containsEditing, setContainsEditing] = useState<ContainsRule | null>(null)
  const [categoryOnlyOpen, setCategoryOnlyOpen] = useState(false)
  // step8: drag a name onto another → confirm → merge.
  const merge = useMergeNames()
  const [merging, setMerging] = useState<{ from: string; into: string } | null>(null)
  // step9: a group being created (id undefined) or renamed; the name an exception link went to.
  // step2 (2026-11-09): `assign` = the name whose group chip asked for the new group — it joins it.
  const [groupEdit, setGroupEdit] = useState<{ id?: number; name: string; assign?: string } | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const search = useNameSearch(query)

  const allAgencies = tax.data?.agencies ?? []
  const groups = names.data?.groups ?? BUILTIN_GROUPS
  const groupLabel = (key: string) => groups.find((g) => g.key === key)?.label ?? TYPE_LABEL[key as NameType] ?? key
  const groupOf = (n: LedgerName) => (n.unclarified ? 'OTHER' : (n.group ?? n.type))
  /** A name that is a tax agency (or the nameless rows) is not a payee: it never merges. */
  const mergeable = (n: LedgerName) =>
    !n.unclarified && !allAgencies.some((a) => a.name.toLowerCase() === n.name.toLowerCase())
  const q = query.trim().toLowerCase()
  // step9: the descriptions the search found, per name (lower-cased) — those names show too.
  const hits = useMemo(() => {
    const out = new Map<string, Set<string>>()
    if (q.length < 2) return out
    for (const h of search.data ?? []) {
      const k = h.name.toLowerCase()
      out.set(k, (out.get(k) ?? new Set()).add(h.key))
    }
    return out
  }, [search.data, q])
  const agencies = useMemo(
    () => (tax.data?.agencies ?? []).filter((a) => !q || a.name.toLowerCase().includes(q)),
    [tax.data, q],
  )
  const payees = useMemo(
    () =>
      (names.data?.names ?? []).filter(
        (n) =>
          !q ||
          n.name.toLowerCase().includes(q) ||
          n.category.toLowerCase().includes(q) ||
          hits.has(n.name.toLowerCase()) ||
          n.descriptions.some((d) => d.description.toLowerCase().includes(q)),
      ),
    [names.data, q, hits],
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
  const containsRules = useMemo(
    () =>
      (names.data?.containsRules ?? []).filter(
        (r) => !q || r.text.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q),
      ),
    [names.data, q],
  )
  const clarified = payees.filter((n) => !n.unclarified)
  const unclarified = payees.find((n) => n.unclarified)
  const count = (f: Filter) =>
    f === 'ALL'
      ? agencies.length + payees.length
      : f === 'AGENCY'
        ? agencies.length
        : f === 'UNRECOGNIZED'
          ? unrecognized.length
          : clarified.filter((n) => groupOf(n) === f).length
  const shownAgencies = filter === 'ALL' || filter === 'AGENCY' ? agencies : []
  const shownGroups = filter === 'ALL' ? groups : groups.filter((g) => g.key === filter)
  const shownUnrecognized = filter === 'UNRECOGNIZED' ? unrecognized : []
  const shownContains = filter === 'ALL' || filter === 'UNRECOGNIZED' ? containsRules : []
  const openContains = (rule: ContainsRule | null) => {
    setContainsEditing(rule)
    setContainsOpen(true)
  }
  const resetting = (rule: NameRuleRef | null) =>
    !!rule &&
    resetRule.isPending &&
    resetRule.variables?.matchType === rule.matchType &&
    resetRule.variables?.matchKey === rule.matchKey

  /** step9: jump to a name (an exception link) — show it, scroll to it, flash it. */
  const goTo = (name: string) => {
    setFilter('ALL')
    setQuery('')
    setHighlight(name.toLowerCase())
    setTimeout(() => document.getElementById(rowId(name))?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
    setTimeout(() => setHighlight((h) => (h === name.toLowerCase() ? null : h)), 2500)
  }
  /**
   * step9: a description dropped on a name — every row of it gets that name, now and later.
   * step2: one already linked to another name asks first (RuleConflictDialog).
   */
  const moveDescription = (target: string, d: { key: string }, replace = false): void =>
    saveRule.mutate(
      { matchType: 'DESCRIPTION', matchKey: d.key, name: target, category: null, scope: 'ALWAYS', replace },
      { onError: (e) => conflict.offer(e, target, () => moveDescription(target, d, true)) },
    )

  const open = (agency: TaxAgency | null) => {
    setEditing(agency)
    setDialogOpen(true)
  }
  const loading = tax.isLoading || names.isLoading
  const error =
    tax.error ??
    names.error ??
    save.error ??
    setNameTax.error ??
    resetRule.error ??
    merge.error ??
    saveRule.error ??
    setGroup.error ??
    saveGroup.error ??
    deleteGroup.error

  /** step2 (2026-11-09): a name dropped on a group (its section or its filter chip) joins it. */
  const dropOnGroup = (key: string) => (name: string) => {
    const n = clarified.find((x) => x.name.toLowerCase() === name.toLowerCase())
    if (n && groupOf(n) !== key) setGroup.mutate({ name: n.name, group: key })
  }
  const nameRow = (n: LedgerName) => (
    <NameRow
      key={`n:${n.name}`}
      n={n}
      label={n.unclarified ? 'Unrecognized' : groupLabel(groupOf(n))}
      group={groupOf(n)}
      groups={groups}
      groupPending={setGroup.isPending && setGroup.variables?.name === n.name}
      onGroup={(key) => key !== groupOf(n) && setGroup.mutate({ name: n.name, group: key })}
      onNewGroup={() => setGroupEdit({ name: '', assign: n.name })}
      agencies={allAgencies}
      pending={setNameTax.isPending && setNameTax.variables?.name === n.name}
      onAgencies={(agencyIds) => setNameTax.mutate({ name: n.name, agencyIds })}
      onOpen={onOpenName && (() => onOpenName(n.name))}
      files={fileCounts.get(nameKey(n.name)) ?? EMPTY_COUNTS}
      onFiles={(filter) => setFiles({ kind: 'name', name: n.name, filter })}
      onRename={
        mergeable(n)
          ? (to) =>
              saveRule.mutateAsync({ matchType: 'NAME', matchKey: n.ruleKey, name: to, category: null, scope: 'ALWAYS' })
          : undefined
      }
      onEdit={() => setRuleTarget({ kind: 'name', view: n })}
      onReset={() => n.rule && resetRule.mutate(n.rule)}
      resetting={resetting(n.rule)}
      unrecognized={n.unclarified ? (names.data?.unrecognized ?? []) : undefined}
      onAssign={(u) => setRuleTarget({ kind: 'unrecognized', view: u })}
      mergeable={mergeable(n)}
      onMergeInto={mergeable(n) ? (from) => setMerging({ from, into: n.name }) : undefined}
      onDescription={n.unclarified ? undefined : (d) => moveDescription(n.name, d)}
      matches={hits.get(n.name.toLowerCase())}
      query={q}
      highlighted={highlight === n.name.toLowerCase()}
      onGoTo={goTo}
    />
  )
  const hasUnsorted = unsorted.error + unsorted.document + unsorted.related + unsorted.reading > 0
  const nothing =
    !(filter === 'ALL' && !q && hasUnsorted) &&
    !(filter === 'ALL' && accounts.length) &&
    !shownAgencies.length &&
    !payees.length &&
    !shownUnrecognized.length &&
    !shownContains.length &&
    !(filter === 'ALL' && groups.some((g) => g.id))

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-[#0B1C2C]">Names</h2>
          <p className="text-sm text-muted-foreground">
            Every name on your ledger, in its group — click one for its transactions. Edit a name to change its
            category or the bank descriptions it follows; it is saved for this ledger and every statement from now
            on. Drag a name onto another to merge them, onto a group (or its chip below) to move it there — or click
            its group tag — and drag a description onto another name. A name is taxed only by the agencies you pick
            for it.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setAdding(true)}
            className="h-10 gap-2 rounded-lg px-4"
            title="A name of your own — listed even with no transactions, ready for its files"
          >
            <UserRound className="size-4" />
            Add name
          </Button>
          <Button
            variant="outline"
            onClick={() => setGroupEdit({ name: '' })}
            className="h-10 gap-2 rounded-lg px-4"
            title="A group of your own, e.g. Employees"
          >
            <Users className="size-4" />
            Add group
          </Button>
          <Button onClick={() => open(null)} className="h-10 gap-2 rounded-lg bg-brand px-4 text-white hover:bg-brand/85">
            <Plus className="size-4" />
            Add agency
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b px-5 py-3 sm:flex-row sm:items-center">
        <div className="relative w-full shrink-0 sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, category or bank description"
            className="h-9 pl-9"
          />
        </div>
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
          {[
            { id: 'ALL', label: 'All' },
            ...groups.map((g) => ({ id: g.key, label: g.label })),
            { id: 'AGENCY', label: 'Tax agencies' },
            { id: 'UNRECOGNIZED', label: 'Unrecognized' },
          ].map((f) => (
            <FilterChip
              key={f.id}
              label={f.label}
              count={count(f.id)}
              active={filter === f.id}
              onClick={() => setFilter(f.id)}
              onDropName={groups.some((g) => g.key === f.id) ? dropOnGroup(f.id) : undefined}
            />
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 p-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : nothing ? (
        <div className="px-6 py-14 text-center">
          <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Landmark className="size-5" />
          </span>
          <p className="font-medium text-[#0B1C2C]">{q || filter !== 'ALL' ? 'Nothing matches' : 'No names yet'}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {q || filter !== 'ALL'
              ? 'Try another search or group.'
              : 'Names appear here once your statements are read. Add a tax agency — e.g. “GST”, sales 5%, purchase 5% — to post its tax under every taxable transaction.'}
          </p>
        </div>
      ) : (
        <div>
          {filter === 'ALL' && !q && hasUnsorted && (
            <ul className="border-b bg-red-50/30">
            <SpecialRow
              icon={<Inbox className="size-4" />}
              tone="red"
              title="Unsorted"
              subtitle="Files we could not file under a name yet — move each to its name, or ask the AI."
              counts={unsorted}
              onOpen={(filter) => setFiles({ kind: 'name', name: '', filter })}
            />
            </ul>
          )}
          {filter === 'ALL' && accounts.length > 0 && (
            <div className="border-b">
              <p className="bg-muted/40 px-5 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Bank accounts · {accounts.length}
              </p>
              <ul className="divide-y">
                {accounts
                  .filter((acc) => !q || acc.name.toLowerCase().includes(q))
                  .map((acc) => (
                    <SpecialRow
                      key={`acc:${acc.name}`}
                      icon={acc.card ? <CreditCard className="size-4" /> : <Landmark className="size-4" />}
                      tone="green"
                      title={acc.name}
                      subtitle={`${acc.statements.length} statement${acc.statements.length === 1 ? '' : 's'} — click for the statements and their transactions`}
                      counts={{ ...EMPTY_COUNTS, related: acc.statements.length }}
                      onOpen={() => setFiles({ kind: 'account', account: acc })}
                    />
                  ))}
              </ul>
            </div>
          )}
          {shownAgencies.length > 0 && (
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
            </ul>
          )}
          {filter === 'ALL' && unclarified && <ul className="divide-y border-t">{nameRow(unclarified)}</ul>}
          {filter !== 'AGENCY' &&
            filter !== 'UNRECOGNIZED' &&
            shownGroups.map((g) => {
              const members = clarified.filter((n) => groupOf(n) === g.key)
              // While searching, a group with nothing found stays out of the way.
              if (q && !members.length) return null
              return (
                <GroupSection
                  key={g.key}
                  group={g}
                  count={members.length}
                  onDrop={dropOnGroup(g.key)}
                  onRename={g.id ? () => setGroupEdit({ id: g.id, name: g.label }) : undefined}
                  onDelete={g.id ? () => deleteGroup.mutate(g.id!) : undefined}
                >
                  {members.map(nameRow)}
                </GroupSection>
              )
            })}
          {shownUnrecognized.length > 0 && (
            <div className="border-t px-3 py-2">
              <UnclarifiedTable
                rows={shownUnrecognized}
                actions={(u) => (
                  <>
                    <Button variant="outline" size="xs" onClick={() => setRuleTarget({ kind: 'unrecognized', view: u })}>
                      Assign
                    </Button>
                    {u.rule && <ResetButton onReset={() => resetRule.mutate(u.rule!)} resetting={resetting(u.rule)} />}
                  </>
                )}
              />
            </div>
          )}
          {shownContains.length > 0 && (
            <div className="border-t">
              <button
                type="button"
                onClick={() => setCategoryOnlyOpen((v) => !v)}
                className="flex w-full items-center gap-2 px-5 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:bg-muted/40"
              >
                <ChevronDown className={cn('size-4 transition-transform', categoryOnlyOpen && 'rotate-180')} />
                Category-only description rules · {shownContains.length}
              </button>
              {categoryOnlyOpen && (
                <ul className="divide-y">
                  {shownContains.map((r) => (
                    <ContainsRuleRow
                      key={`c:${r.key}`}
                      rule={r}
                      onEdit={() => openContains(r)}
                      onDelete={() => resetRule.mutate({ matchType: 'CONTAINS', matchKey: r.key })}
                      deleting={resetting({ matchType: 'CONTAINS', matchKey: r.key })}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
      {error && !ruleConflictOf(error) && <p className="px-5 pb-4 text-sm text-destructive">{error.message}</p>}
      <RuleConflictDialog conflict={conflict} />

      <AgencyDialog open={dialogOpen} onOpenChange={setDialogOpen} agency={editing} />
      <FilesDialog
        target={files}
        onOpenChange={(o) => !o && setFiles(null)}
        onViewTransaction={onViewTransaction}
        onOpenStatement={onOpenStatement}
      />
      <AddNameDialog
        open={adding}
        onOpenChange={setAdding}
        groups={groups}
        onAdded={(name) => setFiles({ kind: 'name', name })}
      />
      <NameRuleDialog target={ruleTarget} onOpenChange={(o) => !o && setRuleTarget(null)} />
      <ContainsRuleDialog open={containsOpen} rule={containsEditing} onOpenChange={setContainsOpen} />

      <Dialog open={!!groupEdit} onOpenChange={(o) => !o && setGroupEdit(null)}>
        <DialogContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              const name = groupEdit?.name.trim()
              if (!groupEdit || !name) return
              saveGroup.mutate(
                { id: groupEdit.id, name },
                {
                  onSuccess: (data) => {
                    const made = data.groups?.find((g) => g.label.toLowerCase() === name.toLowerCase())
                    if (groupEdit.assign && made) setGroup.mutate({ name: groupEdit.assign, group: made.key })
                    setGroupEdit(null)
                  },
                },
              )
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {groupEdit?.id ? 'Rename group' : groupEdit?.assign ? `New group for ${groupEdit.assign}` : 'Add a group'}
              </DialogTitle>
              <DialogDescription>
                A group of your own next to Suppliers, Customers and Other — e.g. “Employees”. Drag names onto it.
                It only changes where a name is listed: its categories and tax stay as they are.
              </DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              maxLength={64}
              value={groupEdit?.name ?? ''}
              onChange={(e) => setGroupEdit((g) => (g ? { ...g, name: e.target.value } : g))}
              placeholder="Employees"
            />
            {saveGroup.error && <p className="text-sm text-destructive">{saveGroup.error.message}</p>}
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={saveGroup.isPending || !groupEdit?.name.trim()}>
                {saveGroup.isPending ? 'Saving…' : groupEdit?.id ? 'Rename' : 'Add group'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!merging} onOpenChange={(o) => !o && setMerging(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Merge {merging?.from} into {merging?.into}?
            </DialogTitle>
            <DialogDescription>
              Every transaction of {merging?.from} takes the name {merging?.into}, its category and its tax, and new
              ones follow. {merging?.from}'s own category and tax are dropped. Dragging back cannot split them again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              disabled={merge.isPending}
              onClick={() => merging && merge.mutate(merging, { onSettled: () => setMerging(null) })}
            >
              {merge.isPending ? 'Merging…' : 'Merge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
 * One filter chip above the list (All, a group, Tax agencies, Unrecognized). step2
 * (2026-11-09): a group's chip is also a drop target — drag a name onto "Customers" to move it.
 */
function FilterChip({
  label,
  count,
  active,
  onClick,
  onDropName,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  onDropName?: (name: string) => void
}) {
  const drop = useGroupDrop(onDropName)
  return (
    <button
      type="button"
      onClick={onClick}
      {...drop.props}
      title={onDropName ? `Show ${label} — or drop a name here to move it into ${label}` : undefined}
      className={cn(
        'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all',
        active ? 'bg-[#0B1C2C] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground',
        drop.over && 'scale-105 bg-brand text-white ring-2 ring-brand/40 ring-offset-1',
      )}
    >
      {label} <span className="opacity-70 tabular-nums">{count}</span>
    </button>
  )
}

/**
 * step2 (2026-11-09): a name's group tag — click it to move the name to another group, or to
 * a new one, without opening the Edit dialog.
 */
function GroupChip({
  name,
  group,
  label,
  groups,
  pending,
  onGroup,
  onNewGroup,
}: {
  name: string
  group: string
  label: string
  groups: NameGroup[]
  pending: boolean
  onGroup: (key: string) => void
  onNewGroup: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        draggable={false}
        onMouseDown={(e) => e.stopPropagation()}
        title={`${name} is in ${label} — click to move it`}
        className={cn(
          'inline-flex h-5 shrink-0 cursor-pointer items-center gap-0.5 rounded-4xl px-2 text-xs font-medium transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none',
          isBuiltin(group) ? TYPE_BADGE[group] : OWN_GROUP_BADGE,
        )}
      >
        {pending ? 'Moving…' : label}
        <ChevronDown className="size-3 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-52 overflow-y-auto">
        {/* base-ui throws when a GroupLabel (DropdownMenuLabel) is not inside a Group. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Move {name} to</DropdownMenuLabel>
          {groups.map((g) => (
            <DropdownMenuItem key={g.key} onClick={() => onGroup(g.key)} className={cn(g.key === group && 'font-semibold')}>
              <TypeDot group={g.key} />
              <span className="min-w-0 flex-1 truncate">{g.label}</span>
              {g.key === group && <Check className="ml-auto size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onNewGroup} className="text-brand">
          <Plus className="size-4" /> New group…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The small colour dot of a group in menus. */
function TypeDot({ group }: { group: string }) {
  return (
    <span
      className={cn('size-2.5 shrink-0 rounded-full', isBuiltin(group) ? TYPE_BADGE[group] : OWN_GROUP_BADGE)}
      aria-hidden
    />
  )
}

/**
 * step9: one group on the Names tab — its header, its names, and the place a name dragged
 * from another group is dropped (a drop ON a name merges instead). A group of the customer's
 * own can be renamed or removed (its names go back to following their category).
 */
function GroupSection({
  group,
  count,
  onDrop,
  onRename,
  onDelete,
  children,
}: {
  group: NameGroup
  count: number
  onDrop: (name: string) => void
  onRename?: () => void
  onDelete?: () => void
  children: ReactNode
}) {
  const drop = useGroupDrop(onDrop)
  return (
    <section
      {...drop.props}
      className={cn('border-t transition-colors', drop.over && 'bg-brand/5 outline-2 -outline-offset-2 outline-brand/30')}
    >
      <div className="flex items-center gap-2 bg-muted/30 px-5 py-2">
        <TypeIcon type={group.key} />
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group.label}</h3>
        <span className="text-xs text-muted-foreground/80 tabular-nums">{count}</span>
        {(onRename || onDelete) && (
          <span className="ml-auto flex gap-1">
            {onRename && (
              <Button variant="ghost" size="icon-xs" title="Rename this group" onClick={onRename}>
                <Pencil />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon-xs"
                title="Remove this group (its names go back to following their category)"
                className="text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 />
              </Button>
            )}
          </span>
        )}
      </div>
      {count ? (
        <ul className="divide-y">{children}</ul>
      ) : (
        <p className="px-5 py-3 text-xs text-muted-foreground">Drag a name here to put it in {group.label}.</p>
      )}
    </section>
  )
}

/**
 * A payee. "Other" names (transfers, loans, owner money) are never taxed: no agencies. The
 * Unclarified name entry (the rows with no name) lists its descriptions, each with Assign,
 * and cannot be renamed itself. step9: its descriptions say which rule ties them here and
 * how many of their rows are exceptions (renamed one time — click to see where they went);
 * a name holding exceptions says what they are an exception from. A description can be
 * dragged onto another name.
 */
function NameRow({
  n,
  label,
  group,
  groups,
  groupPending,
  onGroup,
  onNewGroup,
  agencies,
  pending,
  onAgencies,
  onOpen,
  files = EMPTY_COUNTS,
  onFiles,
  onRename,
  onEdit,
  onReset,
  resetting,
  unrecognized,
  onAssign,
  mergeable = false,
  onMergeInto,
  onDescription,
  matches,
  query,
  highlighted,
  onGoTo,
}: {
  n: LedgerName
  /** Its group's label ("Suppliers", "Employees"). */
  label: string
  group: string
  /** step2 (2026-11-09): every group, for the clickable group tag. */
  groups: NameGroup[]
  groupPending: boolean
  onGroup: (key: string) => void
  onNewGroup: () => void
  agencies: TaxAgency[]
  pending: boolean
  onAgencies: (agencyIds: number[]) => void
  onOpen?: () => void
  /** step2 (2026-11-11): its folder's three counts, and opening the folder (or one list). */
  files?: BucketCounts
  onFiles?: (filter: BucketFilter) => void
  /** step2: rename it in place (a NAME rule, like the Edit dialog); throws to keep the field open. */
  onRename?: (to: string) => Promise<unknown>
  onEdit: () => void
  onReset: () => void
  resetting: boolean
  unrecognized?: UnrecognizedName[]
  onAssign: (u: UnrecognizedName) => void
  /** step8: it can be dragged onto another name to merge into it. */
  mergeable?: boolean
  /** Another name was dropped on this one: merge it into this. */
  onMergeInto?: (from: string) => void
  /** step9: a description was dropped on this name: nest it here. */
  onDescription?: (d: { key: string; description: string }) => void
  /** step9: the description keys the search found under it — shown open, marked. */
  matches?: ReadonlySet<string>
  query: string
  /** step9: an exception link just jumped here. */
  highlighted?: boolean
  onGoTo: (name: string) => void
}) {
  const [toggled, setOpen] = useState(false)
  const [exceptionsOf, setExceptionsOf] = useState<string | null>(null)
  const drop = useNameDrop(n.name, onMergeInto, onDescription)
  const many = n.descriptions.length
  const taxable = n.type !== 'OTHER' || !!n.unclarified
  const matched = (d: { key?: string; description: string }) =>
    (!!d.key && !!matches?.has(d.key)) || (query.length >= 2 && d.description.toLowerCase().includes(query))
  // A search that found it by a description opens it on that description.
  const open = toggled || (!!query && n.descriptions.some(matched))
  const exceptionCount = n.descriptions.reduce((c, d) => c + (d.exceptions?.reduce((x, e) => x + e.rows, 0) ?? 0), 0)
  return (
    <li
      id={rowId(n.name)}
      {...(mergeable ? nameDragProps(n.name) : {})}
      {...drop.props}
      title={mergeable ? 'Drag onto another name to merge them, or onto a group to move it' : undefined}
      className={cn(
        'px-5 py-3 transition-colors',
        mergeable && 'cursor-grab active:cursor-grabbing',
        drop.over && 'bg-brand/10 ring-2 ring-brand/40 ring-inset',
        highlighted && 'bg-amber-50',
      )}
    >
      <div className="flex items-center gap-4">
      {n.unclarified ? (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700">
          <CircleHelp className="size-4" />
        </span>
      ) : (
        <TypeIcon type={group} />
      )}
      <div className="min-w-0 flex-1">
        <RenameName name={n.name} onRename={onRename}>
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
        </RenameName>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {n.unclarified ? (
            <Badge className="bg-orange-100 text-orange-800">Unrecognized</Badge>
          ) : (
            <GroupChip
              name={n.name}
              group={group}
              label={label}
              groups={groups}
              pending={groupPending}
              onGroup={onGroup}
              onNewGroup={onNewGroup}
            />
          )}
          {n.rule && <Badge className="bg-brand/10 text-brand">Edited</Badge>}
          <span className="truncate text-sm text-muted-foreground">
            {n.category}
            {n.otherCategories > 0 && ` +${n.otherCategories} more`}
          </span>
          <span className="text-xs text-muted-foreground/80 tabular-nums">
            · {n.rows.toLocaleString()} row{n.rows === 1 ? '' : 's'}
          </span>
          <Total total={n.total} />
          {(n.fields ?? [])
            .filter((f) => f.kind === 'PHONE' || f.kind === 'EMAIL')
            .slice(0, 3)
            .map((f, i) => {
              const Icon = FIELD_KIND_ICON[f.kind]
              return (
                <a
                  key={`${i}:${f.value}`}
                  href={fieldHref(f) ?? undefined}
                  draggable={false}
                  title={`${f.label || FIELD_KIND_LABEL[f.kind]}: ${f.value}`}
                  className="inline-flex max-w-44 items-center gap-1 truncate text-xs text-muted-foreground hover:text-brand"
                >
                  <Icon className="size-3 shrink-0" />
                  <span className="truncate">{f.value}</span>
                </a>
              )
            })}
          {exceptionCount > 0 && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-xs font-medium text-amber-700 hover:underline"
              title="Rows of its descriptions that were renamed one time"
            >
              · {exceptionCount} exception{exceptionCount === 1 ? '' : 's'}
            </button>
          )}
        </div>
        {(n.exceptionOf ?? []).map((x) => (
          <p key={`${x.main}|${x.key}`} className="mt-0.5 text-xs text-amber-800">
            {x.rows === 1 ? 'One row is' : `${x.rows} rows are`} an exception from{' '}
            <button type="button" onClick={() => onGoTo(x.main)} className="font-medium underline hover:text-amber-950">
              {x.main}
            </button>{' '}
            <span className="text-amber-800/70">(“{x.description}”)</span>
          </p>
        ))}
        {many > 0 && !open && (
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
        {onFiles && <FolderButton name={n.name} counts={files} onOpen={onFiles} />}
        {many > 0 && (
          <Button
            variant="ghost"
            size="icon-sm"
            title={open ? 'Hide descriptions' : 'Show the descriptions under this name'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
          </Button>
        )}
        {!n.unclarified && (
          <Button variant="ghost" size="icon-sm" title={`Edit ${n.name} — its category and descriptions`} onClick={onEdit}>
            <Pencil />
          </Button>
        )}
        {n.rule && <ResetButton onReset={onReset} resetting={resetting} />}
      </div>
      </div>
      {open && unrecognized && (
        <div className="mt-2 ml-13 rounded-lg bg-muted/40 p-2">
          <UnclarifiedTable
            rows={unrecognized}
            highlighted={(u) => matched({ key: u.key, description: u.sampleDescription })}
            actions={(u) => (
              <Button variant="outline" size="xs" onClick={() => onAssign(u)}>
                Assign
              </Button>
            )}
          />
        </div>
      )}
      {open && !unrecognized && (
        <ul className="mt-2 ml-13 flex flex-col gap-1 rounded-lg bg-muted/40 p-2">
          {(n.followsContains ?? []).map((c) => (
            <li key={`c:${c.key}`} className="flex items-center gap-3 px-2 py-1 text-sm">
              <ListFilter className="size-3.5 shrink-0 text-brand" />
              <span className="min-w-0 flex-1 truncate text-[#0B1C2C]">
                Every description containing “<span className="font-medium">{c.text}</span>”
              </span>
              <span className="w-14 shrink-0 text-right text-xs text-muted-foreground/80 tabular-nums">
                {c.rows.toLocaleString()} row{c.rows === 1 ? '' : 's'}
              </span>
            </li>
          ))}
          {n.descriptions.map((d) => {
            const exceptions = d.exceptions ?? []
            const exRows = exceptions.reduce((x, e) => x + e.rows, 0)
            const id = d.key ?? d.description
            return (
              <li key={id}>
                <div
                  {...(d.key && onDescription ? descriptionDragProps(d.key, d.description) : {})}
                  title={d.key ? 'Drag onto another name to move this description there' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded px-2 py-1 text-sm',
                    d.key && 'cursor-grab active:cursor-grabbing',
                    matched(d) && 'bg-amber-100/70',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-[#0B1C2C]" title={d.description}>
                    {d.description}
                  </span>
                  {d.rule && (
                    <span className="shrink-0 text-xs text-brand" title="Your rule ties it to this name">
                      {d.rule.matchType === 'CONTAINS' ? `contains “${d.rule.text}”` : 'your rule'}
                    </span>
                  )}
                  {exRows > 0 && (
                    <button
                      type="button"
                      onClick={() => setExceptionsOf(exceptionsOf === id ? null : id)}
                      className="shrink-0 text-xs font-medium text-amber-700 hover:underline"
                      title="Rows of this description renamed one time"
                    >
                      {exRows} exception{exRows === 1 ? '' : 's'}
                    </button>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">{d.category}</span>
                  <span className="w-14 shrink-0 text-right text-xs text-muted-foreground/80 tabular-nums">
                    {d.rows.toLocaleString()} row{d.rows === 1 ? '' : 's'}
                  </span>
                </div>
                {exceptionsOf === id && (
                  <ul className="mt-0.5 mb-1 ml-4 flex flex-col gap-0.5 border-l-2 border-amber-300 pl-3 text-xs">
                    {exceptions.map((e) => (
                      <li key={e.name} className="flex items-center gap-2">
                        <span className="text-muted-foreground">Renamed one time to</span>
                        <button
                          type="button"
                          onClick={() => onGoTo(e.name)}
                          className="font-medium text-amber-800 underline hover:text-amber-950"
                        >
                          {e.name}
                        </button>
                        <span className="text-muted-foreground/80 tabular-nums">
                          · {e.rows} row{e.rows === 1 ? '' : 's'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}

/**
 * A customer's "description contains …" rule: the text, what it gives (name and/or
 * category) and how many rows it reaches. Edit, or delete it (its rows go back to the
 * default).
 */
function ContainsRuleRow({
  rule,
  onEdit,
  onDelete,
  deleting,
}: {
  rule: ContainsRule
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const gives = [rule.name, rule.category].filter(Boolean).join(' · ')
  return (
    <li className="flex items-center gap-4 px-5 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
        <ListFilter className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[#0B1C2C]" title={rule.text}>
          Description contains “{rule.text}”
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <Badge className="bg-brand/10 text-brand">Contains rule</Badge>
          <span className="truncate text-sm text-muted-foreground">→ {gives}</span>
          <span className="text-xs text-muted-foreground/80 tabular-nums">
            · {rule.rows.toLocaleString()} row{rule.rows === 1 ? '' : 's'}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon-sm" title="Edit this rule" onClick={onEdit}>
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Delete this rule"
          disabled={deleting}
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 />
        </Button>
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

/** step2: a payee's name with a pencil beside it — renamed in place; as is when it cannot be. */
function RenameName({
  name,
  onRename,
  children,
}: {
  name: string
  onRename?: (to: string) => Promise<unknown>
  children: ReactNode
}) {
  if (!onRename) return <>{children}</>
  return (
    <InlineRename value={name} onSave={onRename} label={`Rename ${name}`}>
      {children}
    </InlineRename>
  )
}

/** step2 (2026-11-11): an entry above the names — Unsorted, or a bank account and its statements. */
function SpecialRow({
  icon,
  tone,
  title,
  subtitle,
  counts,
  onOpen,
}: {
  icon: ReactNode
  tone: 'red' | 'green'
  title: string
  subtitle: string
  counts: BucketCounts
  onOpen: (filter: BucketFilter) => void
}) {
  return (
    <li className="flex list-none items-center gap-4 px-5 py-3">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          tone === 'red' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700',
        )}
      >
        {icon}
      </span>
      <button type="button" onClick={() => onOpen(null)} className="min-w-0 flex-1 text-left">
        <p className="truncate font-medium text-[#0B1C2C] hover:text-brand hover:underline">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
      </button>
      <FolderButton name={title} counts={counts} onOpen={onOpen} />
    </li>
  )
}

/** step2 (2026-11-11): add a name by hand — then its folder opens, ready for files. */
function AddNameDialog({
  open,
  onOpenChange,
  groups,
  onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: NameGroup[]
  onAdded: (name: string) => void
}) {
  const add = useAddName()
  const [name, setName] = useState('')
  const [group, setGroup] = useState<string | null>(null)
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) {
          setName('')
          setGroup(null)
          add.reset()
        }
      }}
    >
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            const typed = name.trim()
            if (!typed) return
            add.mutate(
              { name: typed, group },
              {
                onSuccess: (r) => {
                  onOpenChange(false)
                  setName('')
                  setGroup(null)
                  onAdded(r.name)
                },
              },
            )
          }}
        >
          <DialogHeader>
            <DialogTitle>Add a name</DialogTitle>
            <DialogDescription>
              A person or business you deal with — a landlord, a supplier, an employee. It is listed even before it has
              transactions, so you can keep its contracts and other files in its folder.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            maxLength={191}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name, e.g. Main Street Landlord"
          />
          <div className="flex flex-wrap gap-1.5">
            {groups.map((g) => (
              <button
                key={g.key}
                type="button"
                aria-pressed={group === g.key}
                onClick={() => setGroup(group === g.key ? null : g.key)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium ring-1',
                  group === g.key ? 'bg-brand text-white ring-brand' : 'bg-white text-muted-foreground ring-black/10',
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
          {add.error && <p className="text-sm text-destructive">{add.error.message}</p>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={!name.trim() || add.isPending} className="bg-brand text-white hover:bg-brand/85">
              Add name
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
