import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useSearchState } from '@/hooks/useBookView'
import {
  Check,
  ChevronDown,
  CircleDashed,
  CircleHelp,
  CornerDownRight,
  Landmark,
  ListFilter,
  CreditCard,
  Inbox,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Split as SplitIcon,
  Store,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import {
  rateLabel,
  ruleConflictOf,
  type ContainsRule,
  type LedgerName,
  type NameGroup,
  type NameRuleRef,
  type NameType,
  type SplitGroup,
  type TaxAgency,
  type UnrecognizedName,
  type Statement,
  type SubName,
  type MergeEnd,
  type NamesPage,
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
import { SubNameLine, type SubNameTools } from './SubNameLine'
import { useDeleteAgency } from '@/hooks/useDeleteAgency'
import { useNameAgencies } from '@/hooks/useNameAgencies'
import { useNamesPages, useUnrecognized } from '@/hooks/useNamesPages'
import { useDebounced } from '@/hooks/useDebounced'
import { useSetSubNameParent, useSetSubNameSettings } from '@/hooks/useSplits'
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
import { localGroup, useDeleteNameGroup, useSaveNameGroup, useSetNameGroup } from '@/hooks/useNameGroups'
import { useSaveAgency } from '@/hooks/useSaveAgency'
import { useDeleteSplitGroup, useSaveSplitGroup } from '@/hooks/useSplitGroups'
import { useTax } from '@/hooks/useTax'
import { useMergeNames } from '@/hooks/useMerge'
import { useRuleConflict } from '@/hooks/useRuleConflict'
import i18n, { currentLocale } from '@/i18n'
import { money } from '@/lib/money'
import { cn } from '@/lib/utils'
import { AgencyDialog } from './AgencyDialog'
import { AgencyPicker } from './AgencyPicker'
import { ContainsRuleDialog } from './ContainsRuleDialog'
import { InlineRename } from './InlineRename'
import { exceptionCount } from '@/lib/name-exceptions'
import { FIELD_KIND_ICON, fieldHref, fieldKindLabel } from '@/lib/name-fields'
import { NameRuleDialog, type NameRuleTarget } from './NameRuleDialog'
import { RuleConflictDialog } from './RuleConflictDialog'
import { UnclarifiedTable } from './UnclarifiedTable'
import { DescriptionLink, DescriptionsLine, SubDescriptionsLine } from './DescriptionsLine'
import {
  descriptionDragProps,
  nameDragProps,
  draggedSubId,
  joinDragProps,
  useGroupDrop,
  useHoverOpen,
  useNameDrop,
  useRefuseSubName,
  type DraggedSubName,
} from './name-drag'
import { nameGroupOf } from '@/hooks/useSubNameTools'
import { ExceptionList, ExceptionOfLines } from './Exceptions'
import { FolderButton } from './NameFiles/FileCounts'
import { FilesDialog, type FilesTarget } from './NameFiles/FilesDialog'


/** What a name's rows add up to, red when money went out — as the ledger colours amounts. */
function Total({ total }: { total: number }) {
  const { t } = useTranslation(['names', 'common'])
  return (
    <span
      className={cn('text-xs font-medium tabular-nums', total < 0 ? 'text-red-600' : 'text-emerald-700')}
      title={t('totalTitle')}
    >
      · {money(total)}
    </span>
  )
}

/** What the list shows: everything, the split rules, the nameless rows, or one group (its key). */
type Filter = 'ALL' | 'AGENCY' | 'UNRECOGNIZED' | string

/** A type's label ("Supplier"), in the site's language. */
const typeLabel = (type: NameType | 'AGENCY') => i18n.t(`names:type.${type}`)

/** "12 rows", the count in the site's number format. */
const rowsLabel = (n: number) => i18n.t('names:rows', { count: n, n: n.toLocaleString(currentLocale()) })

/** step9: the built-in groups, until the server's list arrives (labels shown through `localGroup`). */
const BUILTIN_GROUPS: NameGroup[] = [
  { key: 'CUSTOMER', label: 'Customers' },
  { key: 'OTHER', label: 'Other' },
  { key: 'SUPPLIER', label: 'Suppliers' },
]

const TYPE_ICON: Record<NameType | 'AGENCY', typeof Landmark> = {
  AGENCY: SplitIcon,
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
 * step9 (2026-11-17): whether a name's sub-names are unfolded, as the customer last left it
 * (localStorage `names-subs-open`, name → open); none = the default (open with ≤ 5 sub-names).
 */
const SUBS_OPEN_KEY = 'names-subs-open'
const SUBS_OPEN_DEFAULT_MAX = 5
function readSubsOpen(name: string): boolean | null {
  try {
    const all = JSON.parse(localStorage.getItem(SUBS_OPEN_KEY) ?? '{}') as Record<string, boolean>
    const v = all[name.toLowerCase()]
    return typeof v === 'boolean' ? v : null
  } catch {
    return null
  }
}
function writeSubsOpen(name: string, open: boolean) {
  try {
    const all = JSON.parse(localStorage.getItem(SUBS_OPEN_KEY) ?? '{}') as Record<string, boolean>
    all[name.toLowerCase()] = open
    localStorage.setItem(SUBS_OPEN_KEY, JSON.stringify(all))
  } catch {
    // A blocked storage only loses the remembered fold.
  }
}

/**
 * The Names tab: every name on the ledger — the split rules (step9 part 4, were tax agencies: rates,
 * Active switch, edit, delete), then every payee the AI read, in its GROUP (step9: Suppliers, Customers, Other or
 * one of the customer's own, such as Employees — drag a name onto a group to move it), and
 * "Unclarified name": the rows the AI could NOT name. Each name lists the bank descriptions
 * it follows (drag one onto another name to move it there) and its exceptions. The search
 * finds a name by its name, category or bank description. Click a name for its ledger.
 * Edits are the customer's own rules: applied at once and to every statement from now on.
 */
export function Names({
  onOpenName,
  onOpenDescription,
  onOpenSubName,
  statements = [],
  onViewTransaction,
  onOpenStatement,
}: {
  onOpenName?: (name: string) => void
  /** step2 (2026-11-15): a description under a name clicked — that name's rows of it. */
  onOpenDescription?: (name: string, description: string, subName?: SubName) => void
  /** step9: a sub-name clicked in a name's popup — only its rows. */
  onOpenSubName?: (name: string, subName: { id: number; name: string }) => void
  /** step2 (2026-11-11): the book's statements — each bank account is an entry holding them. */
  statements?: Statement[]
  /** A file's "View transaction". */
  onViewTransaction?: (transactionId: number) => void
  /** A statement clicked in a bank account's folder: its transactions. */
  onOpenStatement?: (statementId: number) => void
}) {
  const { t } = useTranslation(['names', 'common'])
  const tax = useTax()
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
  // step9 (2026-11-17): split groups — one open in the group window, one being deleted.
  const [splitGroupEdit, setSplitGroupEdit] = useState<SplitGroup | null>(null)
  const [splitGroupConfirm, setSplitGroupConfirm] = useState<SplitGroup | null>(null)
  const saveSplitGroup = useSaveSplitGroup()
  const deleteSplitGroup = useDeleteSplitGroup()
  // step11 (2026-11-23): in the URL (`?filter=`), so a refresh keeps it.
  const [filter, setFilter] = useSearchState<Filter>('filter', 'ALL')
  const [query, setQuery] = useState('')
  const [containsOpen, setContainsOpen] = useState(false)
  const [containsEditing, setContainsEditing] = useState<ContainsRule | null>(null)
  const [categoryOnlyOpen, setCategoryOnlyOpen] = useState(false)
  // step8: drag a name onto another → confirm → merge.
  const merge = useMergeNames()
  // step9 (2026-11-17, third request): either end may be a sub-name.
  const [merging, setMerging] = useState<{ from: MergeEnd; into: MergeEnd } | null>(null)
  const setSubSettings = useSetSubNameSettings()
  // step9 (2026-11-23): a sub-name dropped on a name may move under it instead of merging.
  const setSubParent = useSetSubNameParent()
  // step9: a group being created (id undefined) or renamed; the name an exception link went to.
  // step2 (2026-11-09): `assign` = the name whose group chip asked for the new group — it joins it.
  // step9 (2026-11-17): `assignSub` = the sub-name whose group chip asked for it.
  const [groupEdit, setGroupEdit] = useState<{
    id?: number
    name: string
    assign?: string
    assignSub?: { id: number; name: string }
  } | null>(null)
  // step9 (2026-11-17): a sub-name dropped on a group section — confirmed first.
  const [subGroupMove, setSubGroupMove] = useState<{ sub: SubName; key: string } | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  // step11 (2026-11-23, user's request): the names come page by page from the server, filtered by
  // the chip and searched there (`GET names/page`); the search is sent once typing pauses.
  const q = useDebounced(query.trim().toLowerCase(), 300)
  const nameFilter = filter === 'AGENCY' || filter === 'UNRECOGNIZED' ? 'ALL' : filter
  const pages = useNamesPages({ filter: nameFilter, q })
  const head = pages.data?.pages[0]?.head
  const loaded = useMemo(() => {
    const all = pages.data?.pages ?? []
    const subs = all.flatMap((p) => p.subNames)
    // step2 (2026-11-15): each name's sub-names ("Walmart - Maintenance"), listed under it.
    const subNamesOf = new Map<string, SubName[]>()
    for (const sub of subs) {
      const k = sub.parent.toLowerCase()
      subNamesOf.set(k, [...(subNamesOf.get(k) ?? []), sub])
    }
    return {
      names: all.flatMap((p) => p.names),
      subs,
      subNamesOf,
      subDescriptions: Object.assign({}, ...all.map((p) => p.subDescriptions)) as NamesPage['subDescriptions'],
      subContains: Object.assign({}, ...all.map((p) => p.subContains)) as NamesPage['subContains'],
      subExceptionOf: Object.assign({}, ...all.map((p) => p.subExceptionOf)) as NamesPage['subExceptionOf'],
      // step9: the descriptions the bank search found, per name (lower-cased).
      matches: new Map(all.flatMap((p) => Object.entries(p.matches)).map(([k, v]) => [k, new Set(v)])),
    }
  }, [pages.data])
  const subNamesOf = loaded.subNamesOf
  // The nameless descriptions: only while the Unrecognized chip shows them.
  const unrecognizedList = useUnrecognized(q, { enabled: filter === 'UNRECOGNIZED' })

  const allAgencies = tax.data?.agencies ?? []
  const groups = (head?.groups ?? BUILTIN_GROUPS).map(localGroup)
  const groupLabel = (key: string) =>
    groups.find((g) => g.key === key)?.label ?? (isBuiltin(key) ? typeLabel(key) : key)
  const groupOf = nameGroupOf
  /** A name that is a tax agency (or the nameless rows) is not a payee: it never merges. */
  const mergeable = (n: LedgerName) =>
    !n.unclarified && !allAgencies.some((a) => a.name.toLowerCase() === n.name.toLowerCase())
  const splitGroups = useMemo(() => tax.data?.groups ?? [], [tax.data])
  const agencies = useMemo(
    () =>
      (tax.data?.agencies ?? []).filter(
        (a) =>
          !q ||
          a.name.toLowerCase().includes(q) ||
          !!splitGroups.find((g) => g.id === a.groupId)?.name.toLowerCase().includes(q),
      ),
    [tax.data, splitGroups, q],
  )
  const containsRules = head?.containsRules ?? []
  // Already filtered by the chip and the search on the server.
  const shownNames = loaded.names
  const unclarified = head?.unclarified ?? undefined
  const count = (f: Filter) =>
    f === 'ALL'
      ? agencies.length + (head?.counts.ALL ?? 0)
      : f === 'AGENCY'
        ? agencies.length
        : (head?.counts[f] ?? 0)
  const shownAgencies = filter === 'ALL' || filter === 'AGENCY' ? agencies : []
  // step9 (2026-11-18, part 4): every rule is its own row; a group is its own row after them, listing its rules
  // by name (shown when it or one of its rules matches the search).
  const shownSplitGroups =
    filter === 'ALL' || filter === 'AGENCY'
      ? splitGroups.filter((g) => !q || g.name.toLowerCase().includes(q) || agencies.some((a) => a.groupId === g.id))
      : []
  const splitGroupName = (id: number | null) => splitGroups.find((g) => g.id === id)?.name
  // The next page loads as the last row nears the screen (the ledger's pattern).
  const [sentinel, setSentinel] = useState<HTMLLIElement | null>(null)
  const { fetchNextPage, isFetchingNextPage, hasNextPage } = pages
  useEffect(() => {
    if (!sentinel || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage()
      },
      { rootMargin: '800px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel, hasNextPage, isFetchingNextPage, fetchNextPage])
  const ownGroup = groups.find((g) => g.id && g.key === filter)
  const shownUnrecognized = filter === 'UNRECOGNIZED' ? (unrecognizedList.data ?? []) : []
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
    // step11 (2026-11-23): the list is paged on the server — search for it, so it is on the first page.
    setQuery(name)
    setHighlight(name.toLowerCase())
    // Scroll once its row is there (the search's page arrives first).
    const find = (tries: number) => {
      const row = document.getElementById(rowId(name))
      if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' })
      else if (tries > 0) setTimeout(() => find(tries - 1), 150)
    }
    setTimeout(() => find(30), 350)
    setTimeout(() => setHighlight((h) => (h === name.toLowerCase() ? null : h)), 5000)
  }
  /**
   * step9: a description dropped on a name — every row of it gets that name, now and later.
   * step2: one already linked to another name asks first (RuleConflictDialog).
   */
  const moveDescription = (target: string, d: { key: string }, replace = false, sub?: SubName): void =>
    saveRule.mutate(
      {
        matchType: 'DESCRIPTION',
        matchKey: d.key,
        name: target,
        category: null,
        scope: 'ALWAYS',
        replace,
        ...(sub && { subNameId: sub.id }),
      },
      {
        onError: (e) => conflict.offer(e, sub?.name ?? target, () => moveDescription(target, d, true, sub)),
      },
    )

  const open = (agency: TaxAgency | null) => {
    setEditing(agency)
    setDialogOpen(true)
  }
  // step9 (2026-11-18, part 4): a rule looks individual even in a group — the group only shows as a chip.
  const agencyRow = (a: TaxAgency) => {
    const inGroup = splitGroupName(a.groupId)
    return (
    <li key={`a:${a.id}`} className={cn('flex items-center gap-4 px-5 py-3.5', !a.active && 'opacity-60')}>
      <TypeIcon type="AGENCY" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[#0B1C2C]">{a.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <Badge className={TYPE_BADGE.AGENCY}>{t('type.AGENCY')}</Badge>
          <span className="text-sm text-muted-foreground tabular-nums">
            {a.rates.map(rateLabel).join(' · ')}
            {a.category && <> → {a.category}</>}
          </span>
          {inGroup && (
            <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800" title={t('agency.inGroupTitle')}>
              {t('agency.inGroup', { group: inGroup })}
            </span>
          )}
        </div>
      </div>
      {inGroup ? (
        // step9 (2026-11-18): a rule in a group is switched on / off on its group.
        <span className="text-xs text-muted-foreground">
          {t(a.active ? 'agency.onWith' : 'agency.offWith', { group: inGroup })}
        </span>
      ) : (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{a.active ? t('active') : t('agency.off')}</span>
          <Switch
            checked={a.active}
            disabled={save.isPending}
            onCheckedChange={(active) => save.mutate({ id: a.id, active })}
            className="data-checked:bg-brand"
            aria-label={t('agency.activeAria', { name: a.name })}
          />
        </label>
      )}
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon-sm" title={t('common:actions.edit')} onClick={() => open(a)}>
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title={t('common:actions.delete')}
          className="text-muted-foreground hover:text-destructive"
          onClick={() => setConfirm(a)}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
    )
  }
  const loading = tax.isLoading || pages.isLoading
  const error =
    tax.error ??
    pages.error ??
    unrecognizedList.error ??
    save.error ??
    setNameTax.error ??
    resetRule.error ??
    merge.error ??
    saveRule.error ??
    setGroup.error ??
    saveGroup.error ??
    deleteGroup.error ??
    setSubSettings.error ??
    setSubParent.error

  /** step2 (2026-11-09): a name dropped on a group (its section or its filter chip) joins it. */
  const dropOnGroup = (key: string) => (name: string) => {
    const n = loaded.names.find((x) => x.name.toLowerCase() === name.toLowerCase())
    if (n && groupOf(n) !== key) setGroup.mutate({ name: n.name, group: key })
  }
  /**
   * step9 (2026-11-17, third request): a sub-name dropped on a group joins it. step9 (2026-11-17): only a
   * real move, and asked first — a drop that missed a name must never change its group silently.
   */
  const dropSubOnGroup = (key: string) => (dragged: DraggedSubName) => {
    const sub = loaded.subs.find((x) => x.id === dragged.id)
    if (!sub) return
    const parent = loaded.names.find((x) => x.name.toLowerCase() === sub.parent.toLowerCase())
    const current = sub.group ?? (parent ? groupOf(parent) : null)
    if (current !== key) setSubGroupMove({ sub, key })
  }
  const nameRow = (n: LedgerName) => (
    <NameRow
      key={`n:${n.name}`}
      n={n}
      label={n.unclarified ? t('row.badgeUnrecognized') : groupLabel(groupOf(n))}
      group={groupOf(n)}
      groups={groups}
      groupPending={setGroup.isPending && setGroup.variables?.name === n.name}
      onGroup={(key) => key !== groupOf(n) && setGroup.mutate({ name: n.name, group: key })}
      onNewGroup={() => setGroupEdit({ name: '', assign: n.name })}
      agencies={allAgencies}
      pending={setNameTax.isPending && setNameTax.variables?.name === n.name}
      onAgencies={(agencyIds, alone) => setNameTax.mutate({ name: n.name, agencyIds, alone })}
      onOpen={onOpenName && (() => onOpenName(n.name))}
      onOpenDescription={onOpenDescription && ((d: string) => onOpenDescription(n.name, d))}
      onOpenSubName={onOpenSubName && ((sub: SubName) => onOpenSubName(n.name, { id: sub.id, name: sub.name }))}
      subNames={n.unclarified ? undefined : subNamesOf.get(n.name.toLowerCase())}
      files={fileCounts.get(nameKey(n.name)) ?? EMPTY_COUNTS}
      onFiles={(filter) => setFiles({ kind: 'name', name: n.name, filter })}
      subTools={{
        groups,
        parentGroup: groupOf(n),
        agencies: allAgencies,
        parentAgencyIds: n.agencyIds,
        groupChip: (sub, group, pending, onGroup) => (
          <GroupChip
            name={sub.name}
            group={group}
            label={groupLabel(group)}
            groups={groups}
            pending={pending}
            onGroup={onGroup}
            onNewGroup={() => setGroupEdit({ name: '', assignSub: { id: sub.id, name: sub.name } })}
          />
        ),
        files: (name) => fileCounts.get(nameKey(name)) ?? EMPTY_COUNTS,
        onFiles: (name, filter) => setFiles({ kind: 'name', name, filter }),
        descriptionsOf: (sub) => loaded.subDescriptions[sub.id] ?? [],
        containsOf: (sub) => loaded.subContains[sub.id] ?? [],
        exceptionOf: (sub) => loaded.subExceptionOf[sub.id] ?? [],
        onGoTo: goTo,
        onDescription: (sub, d) => moveDescription(n.name, d, false, sub),
        onOpenDescription: onOpenDescription && ((d: string, sub: SubName) => onOpenDescription(n.name, d, sub)),
        onMergeInto: (sub, from) => {
          // A wrapper dropped on one of its own sub-names: nothing to merge.
          if (!from.subId && from.name.toLowerCase() === n.name.toLowerCase()) return
          setMerging({
            from: { ...from, wrapper: !from.subId && !!subNamesOf.get(from.name.toLowerCase())?.length },
            into: { name: sub.name, subId: sub.id, category: sub.category },
          })
        },
      }}
      onRename={
        mergeable(n)
          ? (to) =>
              saveRule.mutateAsync({ matchType: 'NAME', matchKey: n.ruleKey, name: to, category: null, scope: 'ALWAYS' })
          : undefined
      }
      onEdit={() => setRuleTarget({ kind: 'name', view: n })}
      onReset={() => n.rule && resetRule.mutate(n.rule)}
      resetting={resetting(n.rule)}
      unrecognized={!!n.unclarified}
      onAssign={(u) => setRuleTarget({ kind: 'unrecognized', view: u })}
      mergeable={mergeable(n)}
      onMergeInto={
        mergeable(n)
          ? (from) =>
              setMerging({
                from: { name: from, wrapper: !!subNamesOf.get(from.toLowerCase())?.length },
                into: { name: n.name, wrapper: !!subNamesOf.get(n.name.toLowerCase())?.length },
              })
          : undefined
      }
      onSubNameInto={
        mergeable(n)
          ? (sub) =>
              setMerging({
                from: { name: sub.name, subId: sub.id },
                into: { name: n.name, wrapper: !!subNamesOf.get(n.name.toLowerCase())?.length },
              })
          : undefined
      }
      onDescription={n.unclarified ? undefined : (d) => moveDescription(n.name, d)}
      matches={loaded.matches.get(n.name.toLowerCase())}
      query={q}
      highlighted={highlight === n.name.toLowerCase()}
      highlight={highlight}
      onGoTo={goTo}
    />
  )
  /**
   * step9 (2026-11-23): a sub-name dropped on a name — besides Merge, it can move under that name (only its
   * parent changes). Its new name as the server makes it: "<name> - <category>", or with its old parent after
   * when the name already has a sub-name in that category (it stays separate); a renamed one keeps its name.
   */
  const moving = (() => {
    if (!merging?.from.subId || merging.into.subId) return null
    const sub = loaded.subs.find((s) => s.id === merging.from.subId)
    if (!sub || sub.parent.toLowerCase() === merging.into.name.toLowerCase()) return null
    const into = merging.into.name
    const clash = (subNamesOf.get(into.toLowerCase()) ?? []).some((s) => s.category === sub.category)
    const name = sub.renamed
      ? sub.name
      : clash
        ? `${into} - ${sub.category} - ${sub.parent}`
        : `${into} - ${sub.category}`
    return { name, clash, category: sub.category }
  })()
  const hasUnsorted = unsorted.error + unsorted.document + unsorted.related + unsorted.reading > 0
  const nothing =
    !(filter === 'ALL' && !q && hasUnsorted) &&
    !(filter === 'ALL' && accounts.length) &&
    !shownAgencies.length &&
    !(head?.counts.ALL ?? 0) &&
    !shownUnrecognized.length &&
    !shownContains.length

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-[#0B1C2C]">{t('tab.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('tab.intro')}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setAdding(true)}
            className="h-10 gap-2 rounded-lg px-4"
            title={t('tab.addNameTitle')}
          >
            <UserRound className="size-4" />
            {t('tab.addName')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setGroupEdit({ name: '' })}
            className="h-10 gap-2 rounded-lg px-4"
            title={t('tab.addGroupTitle')}
          >
            <Users className="size-4" />
            {t('tab.addGroup')}
          </Button>
          <Button onClick={() => open(null)} className="h-10 gap-2 rounded-lg bg-brand px-4 text-white hover:bg-brand/85">
            <Plus className="size-4" />
            {t('tab.addSplitRule')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b px-5 py-3 sm:flex-row sm:items-center">
        <div className="relative w-full shrink-0 sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('tab.search')}
            className="h-9 pl-9"
          />
        </div>
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
          {[
            { id: 'ALL', label: t('filter.all') },
            ...groups.map((g) => ({ id: g.key, label: g.label })),
            { id: 'AGENCY', label: t('filter.splitRules') },
            { id: 'UNRECOGNIZED', label: t('filter.unrecognized') },
          ].map((f) => (
            <FilterChip
              key={f.id}
              label={f.label}
              count={count(f.id)}
              active={filter === f.id}
              onClick={() => setFilter(f.id)}
              onDropName={groups.some((g) => g.key === f.id) ? dropOnGroup(f.id) : undefined}
              onDropSub={groups.some((g) => g.key === f.id) ? dropSubOnGroup(f.id) : undefined}
            />
          ))}
          {/* step9 (2026-11-23): an own group is renamed / removed here (its section header is gone). */}
          {ownGroup && (
            <span className="flex shrink-0 items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon-xs"
                title={t('tab.renameGroup', { group: ownGroup.label })}
                onClick={() => setGroupEdit({ id: ownGroup.id, name: ownGroup.label })}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                title={t('tab.removeGroup', { group: ownGroup.label })}
                className="text-muted-foreground hover:text-destructive"
                disabled={deleteGroup.isPending}
                onClick={() => deleteGroup.mutate(ownGroup.id!, { onSuccess: () => setFilter('ALL') })}
              >
                <Trash2 />
              </Button>
            </span>
          )}
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
          <p className="font-medium text-[#0B1C2C]">{q || filter !== 'ALL' ? t('tab.nothingMatches') : t('tab.noNames')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {q || filter !== 'ALL' ? t('tab.tryAnother') : t('tab.emptyHelp')}
          </p>
        </div>
      ) : (
        <div>
          {filter === 'ALL' && !q && hasUnsorted && (
            <ul className="border-b bg-red-50/30">
            <SpecialRow
              icon={<Inbox className="size-4" />}
              tone="red"
              title={t('tab.unsorted')}
              subtitle={t('tab.unsortedHelp')}
              counts={unsorted}
              onOpen={(filter) => setFiles({ kind: 'name', name: '', filter })}
            />
            </ul>
          )}
          {filter === 'ALL' && accounts.length > 0 && (
            <div className="border-b">
              <p className="bg-muted/40 px-5 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t('tab.bankAccounts', { count: accounts.length })}
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
                      subtitle={t('tab.statements', { count: acc.statements.length })}
                      counts={{ ...EMPTY_COUNTS, related: acc.statements.length }}
                      onOpen={() => setFiles({ kind: 'account', account: acc })}
                    />
                  ))}
              </ul>
            </div>
          )}
          {(shownAgencies.length > 0 || shownSplitGroups.length > 0) && (
            <ul className="divide-y">
              {shownAgencies.map((a) => agencyRow(a))}
              {shownSplitGroups.map((g) => (
                <li key={`g:${g.id}`} className={cn(!g.active && 'opacity-60')}>
                  <div className="flex items-center gap-4 px-5 py-3.5">
                    <TypeIcon type="AGENCY" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[#0B1C2C]">{g.name}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <Badge className={TYPE_BADGE.AGENCY}>{t('splitGroup.badge')}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {g.agencyIds.length
                            ? t('splitGroup.rules', {
                                rules: g.agencyIds
                                  .map((id) => (tax.data?.agencies ?? []).find((a) => a.id === id)?.name)
                                  .filter(Boolean)
                                  .join(' · '),
                              })
                            : t('splitGroup.noRules')}
                        </span>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="hidden sm:inline">{g.active ? t('splitGroup.active') : t('common:status.off')}</span>
                      <Switch
                        checked={g.active}
                        disabled={saveSplitGroup.isPending}
                        onCheckedChange={(active) => saveSplitGroup.mutate({ id: g.id, active })}
                        className="data-checked:bg-brand"
                        aria-label={t('splitGroup.activeAria', { name: g.name })}
                        title={t('splitGroup.switchTitle')}
                      />
                    </label>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title={t('splitGroup.edit')}
                        onClick={() => setSplitGroupEdit(g)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title={t('splitGroup.delete')}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setSplitGroupConfirm(g)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {filter === 'ALL' && unclarified && <ul className="divide-y border-t">{nameRow(unclarified)}</ul>}
          {filter !== 'AGENCY' &&
            filter !== 'UNRECOGNIZED' &&
            (shownNames.length ? (
              <ul className="divide-y border-t">
                {shownNames.map(nameRow)}
                {hasNextPage && (
                  // Keyed by the count, so each new page observes a fresh sentinel.
                  <li key={`more-${shownNames.length}`} ref={setSentinel} className="px-5 py-3 text-sm text-muted-foreground">
                    {t('tab.loadingMore', {
                      shown: shownNames.length.toLocaleString(currentLocale()),
                      total: (pages.data?.pages[0]?.total ?? shownNames.length).toLocaleString(currentLocale()),
                    })}
                  </li>
                )}
              </ul>
            ) : (
              filter !== 'ALL' && (
                <p className="border-t px-5 py-4 text-sm text-muted-foreground">
                  {q
                    ? t('tab.nothingInGroup', { group: groupLabel(filter) })
                    : t('tab.emptyGroup', { group: groupLabel(filter) })}
                </p>
              )
            ))}
          {shownUnrecognized.length > 0 && (
            <div className="border-t px-3 py-2">
              <UnclarifiedTable
                rows={shownUnrecognized}
                actions={(u) => (
                  <>
                    <Button variant="outline" size="xs" onClick={() => setRuleTarget({ kind: 'unrecognized', view: u })}>
                      {t('assign')}
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
                {t('tab.categoryOnly', { count: shownContains.length })}
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
      <AgencyDialog
        open={!!splitGroupEdit}
        onOpenChange={(o) => !o && setSplitGroupEdit(null)}
        agency={null}
        splitGroup={splitGroupEdit}
      />

      <Dialog open={!!splitGroupConfirm} onOpenChange={(o) => !o && setSplitGroupConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('splitGroup.confirmTitle', { name: splitGroupConfirm?.name })}</DialogTitle>
            <DialogDescription>{t('splitGroup.confirmText')}</DialogDescription>
          </DialogHeader>
          {deleteSplitGroup.error && <p className="text-sm text-destructive">{deleteSplitGroup.error.message}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t('common:actions.cancel')}</DialogClose>
            <Button
              variant="destructive"
              disabled={deleteSplitGroup.isPending}
              onClick={() =>
                splitGroupConfirm &&
                deleteSplitGroup.mutate(splitGroupConfirm.id, { onSuccess: () => setSplitGroupConfirm(null) })
              }
            >
              {deleteSplitGroup.isPending ? t('splitGroup.deleting') : t('splitGroup.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
                    if (groupEdit.assignSub && made) setSubSettings.mutate({ id: groupEdit.assignSub.id, group: made.key })
                    setGroupEdit(null)
                  },
                },
              )
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {groupEdit?.id
                  ? t('groupDialog.rename')
                  : groupEdit?.assign || groupEdit?.assignSub
                    ? t('groupDialog.newFor', { name: groupEdit.assign ?? groupEdit.assignSub?.name })
                    : t('groupDialog.add')}
              </DialogTitle>
              <DialogDescription>{t('groupDialog.text')}</DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              maxLength={64}
              value={groupEdit?.name ?? ''}
              onChange={(e) => setGroupEdit((g) => (g ? { ...g, name: e.target.value } : g))}
              placeholder={t('groupDialog.placeholder')}
            />
            {saveGroup.error && <p className="text-sm text-destructive">{saveGroup.error.message}</p>}
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>{t('common:actions.cancel')}</DialogClose>
              <Button type="submit" disabled={saveGroup.isPending || !groupEdit?.name.trim()}>
                {saveGroup.isPending
                  ? t('common:actions.saving')
                  : groupEdit?.id
                    ? t('common:actions.rename')
                    : t('groupDialog.submitAdd')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!subGroupMove} onOpenChange={(o) => !o && setSubGroupMove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('subGroupMove.title', {
                sub: subGroupMove?.sub.name,
                group: subGroupMove ? groupLabel(subGroupMove.key) : '',
              })}
            </DialogTitle>
            <DialogDescription>{t('subGroupMove.text', { parent: subGroupMove?.sub.parent })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t('common:actions.cancel')}</DialogClose>
            <Button
              disabled={setSubSettings.isPending}
              onClick={() =>
                subGroupMove &&
                setSubSettings.mutate(
                  { id: subGroupMove.sub.id, group: subGroupMove.key },
                  { onSettled: () => setSubGroupMove(null) },
                )
              }
            >
              {setSubSettings.isPending ? t('common:actions.saving') : t('subGroupMove.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!merging}
        onOpenChange={(o) => {
          if (o) return
          setMerging(null)
          merge.reset()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t(moving ? 'merge.titleMove' : 'merge.title', { from: merging?.from.name, into: merging?.into.name })}
            </DialogTitle>
            <DialogDescription>
              {t(
                merging?.from.wrapper && !merging.from.subId
                  ? merging.into.subId
                    ? 'merge.wrapperIntoSub'
                    : 'merge.fromWrapper'
                  : merging?.into.wrapper
                  ? 'merge.intoWrapper'
                  : merging?.into.subId
                    ? merging.into.category
                      ? 'merge.intoSubCategory'
                      : 'merge.intoSub'
                    : merging?.from.subId
                      ? 'merge.fromSub'
                      : 'merge.plain',
                { from: merging?.from.name, into: merging?.into.name, category: merging?.into.category },
              )}{' '}
              {t(
                merging?.from.subId || merging?.from.wrapper ? 'merge.subRemoved' : 'merge.dropped',
                { from: merging?.from.name },
              )}{' '}
              {t('merge.noUndo')}
            </DialogDescription>
          </DialogHeader>
          {moving && merging && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium text-[#0B1C2C]">{t('merge.orSub', { name: merging.into.name })}</p>
              <p className="mt-1 text-muted-foreground">
                {t('merge.orSubText', { into: merging.into.name, name: moving.name })}
                {moving.clash && ` ${t('merge.clash', { into: merging.into.name, category: moving.category })}`}
                {!merging.into.wrapper && ` ${t('merge.noSubs', { into: merging.into.name })}`}
              </p>
            </div>
          )}
          {merge.error && !ruleConflictOf(merge.error) && (
            <p className="text-sm text-destructive">{merge.error.message}</p>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t('common:actions.cancel')}</DialogClose>
            {moving && (
              <Button
                variant="outline"
                disabled={setSubParent.isPending || merge.isPending}
                onClick={() => {
                  if (!merging?.from.subId) return
                  setSubParent.mutate(
                    { id: merging.from.subId, name: merging.into.name },
                    { onSettled: () => setMerging(null) },
                  )
                }}
              >
                {setSubParent.isPending ? t('merge.moving') : t('merge.makeSub', { name: merging?.into.name })}
              </Button>
            )}
            <Button
              disabled={merge.isPending || setSubParent.isPending}
              onClick={() => {
                if (!merging) return
                // step9 (2026-11-18, part 2): a sub-name is already gone from the list — close now.
                // A failed merge keeps the window open with the reason (it used to close silently).
                merge.mutate(merging, { onSuccess: () => setMerging(null) })
                if (merging.from.subId) setMerging(null)
              }}
            >
              {merge.isPending ? t('merge.merging') : t('merge.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteRule.title', { name: confirm?.name })}</DialogTitle>
            <DialogDescription>{t('deleteRule.text')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t('common:actions.cancel')}</DialogClose>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => confirm && remove.mutate(confirm.id, { onSuccess: () => setConfirm(null) })}
            >
              {remove.isPending ? t('deleteRule.deleting') : t('deleteRule.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * One filter chip above the list (All, a group, Split rules, Unrecognized). step2
 * (2026-11-09): a group's chip is also a drop target — drag a name onto "Customers" to move it.
 */
function FilterChip({
  label,
  count,
  active,
  onClick,
  onDropName,
  onDropSub,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  onDropName?: (name: string) => void
  /** step9 (2026-11-17, third request): a sub-name dropped here joins the group. */
  onDropSub?: (sub: DraggedSubName) => void
}) {
  const { t } = useTranslation(['names', 'common'])
  const drop = useGroupDrop(onDropName, onDropSub)
  return (
    <button
      type="button"
      onClick={onClick}
      {...drop.props}
      title={onDropName ? t('filter.chipTitle', { label }) : undefined}
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
  const { t } = useTranslation(['names', 'common'])
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        draggable={false}
        onMouseDown={(e) => e.stopPropagation()}
        title={t('groupChip.title', { name, label })}
        className={cn(
          'inline-flex h-5 shrink-0 cursor-pointer items-center gap-0.5 rounded-4xl px-2 text-xs font-medium transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none',
          isBuiltin(group) ? TYPE_BADGE[group] : OWN_GROUP_BADGE,
        )}
      >
        {pending ? t('groupChip.moving') : label}
        <ChevronDown className="size-3 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-52 overflow-y-auto">
        {/* base-ui throws when a GroupLabel (DropdownMenuLabel) is not inside a Group. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('groupChip.moveTo', { name })}</DropdownMenuLabel>
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
          <Plus className="size-4" /> {t('groupChip.newGroup')}
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
 * A payee, with its split rules (step9 part 4: any name may have them — In / Out follow the money). The
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
  onOpenDescription,
  onOpenSubName,
  subNames,
  files = EMPTY_COUNTS,
  onFiles,
  subTools,
  onRename,
  onEdit,
  onReset,
  resetting,
  unrecognized,
  onAssign,
  mergeable = false,
  onMergeInto,
  onSubNameInto,
  onDescription,
  matches,
  query,
  highlighted,
  highlight,
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
  onAgencies: (agencyIds: number[], alone: boolean) => void
  onOpen?: () => void
  /** step2 (2026-11-15): one of its descriptions clicked — its ledger rows of it. */
  onOpenDescription?: (description: string) => void
  /** step2 (2026-11-15): its sub-names ("Walmart - Maintenance"). */
  subNames?: SubName[]
  /** step9: one of its sub-names opened from its popup. */
  onOpenSubName?: (sub: SubName) => void
  /** step2 (2026-11-11): its folder's three counts, and opening the folder (or one list). */
  files?: BucketCounts
  onFiles?: (filter: BucketFilter) => void
  /** step9 part 3: what its sub-names need to show a name's settings. */
  subTools?: SubNameTools
  /** step2: rename it in place (a NAME rule, like the Edit dialog); throws to keep the field open. */
  onRename?: (to: string) => Promise<unknown>
  onEdit: () => void
  onReset: () => void
  resetting: boolean
  /** The Unclarified row: open, it lists the nameless descriptions (loaded then). */
  unrecognized?: boolean
  onAssign: (u: UnrecognizedName) => void
  /** step8: it can be dragged onto another name to merge into it. */
  mergeable?: boolean
  /** Another name was dropped on this one: merge it into this. */
  onMergeInto?: (from: string) => void
  /** step9 (2026-11-17, third request): a sub-name was dropped on this one: merge it into this. */
  onSubNameInto?: (sub: DraggedSubName) => void
  /** step9: a description was dropped on this name: nest it here. */
  onDescription?: (d: { key: string; description: string }) => void
  /** step9: the description keys the search found under it — shown open, marked. */
  matches?: ReadonlySet<string>
  query: string
  /** step9: an exception link just jumped here. */
  highlighted?: boolean
  /** step12 (2026-11-20): the name / sub-name an exception link went to — its wrapper unfolds. */
  highlight?: string | null
  onGoTo: (name: string) => void
}) {
  const { t } = useTranslation(['names', 'common'])
  const [toggled, setOpen] = useState(false)
  const [exceptionsOf, setExceptionsOf] = useState<string | null>(null)
  // step9: a name with sub-names unfolds them under it (click the name or "N sub-names"); a
  // search that finds one of them opens it unfolded.
  // step9 (2026-11-17): open by default with a few sub-names (so they and their descriptions show
  // and take drops at once); the customer's last choice is remembered.
  const [subsToggled, setSubsToggled] = useState<boolean | null>(() => readSubsOpen(n.name))
  const subs = subNames ?? []
  const subsOpen =
    (subsToggled ?? subs.length <= SUBS_OPEN_DEFAULT_MAX) ||
    (!!highlight && subs.some((sub) => sub.name.toLowerCase() === highlight)) ||
    (query.length >= 2 &&
      subs.some(
        (sub) =>
          sub.name.toLowerCase().includes(query) ||
          (subTools?.descriptionsOf?.(sub) ?? []).some((d) => d.description.toLowerCase().includes(query)),
      ))
  const toggleSubs = () => {
    setSubsToggled(!subsOpen)
    writeSubsOpen(n.name, !subsOpen)
  }
  // step9 (2026-11-17, second request): a name with sub-names is only a wrapper ("a rubber
  // band") — no settings, nothing dragged into it or out of it; its sub-names are the names.
  const wrapper = subs.length > 0 && !n.unclarified
  // step9 (2026-11-18): a wrapper takes a name — it lands on its sub-name of the same category. Not a
  // description (that goes onto one of its sub-names). step9 (2026-11-23): a sub-name again — merged into it or
  // moved under it (the dialog asks) — except one of its OWN sub-names, which is refused with a hint.
  const own = (id: number) => subs.some((s) => s.id === id)
  const drop = useNameDrop(
    n.name,
    onMergeInto,
    wrapper ? undefined : onDescription,
    onSubNameInto && ((sub) => !own(sub.id) && onSubNameInto(sub)),
  )
  const refuse = useRefuseSubName(wrapper, () => own(draggedSubId() ?? 0))
  // step9 (2026-11-17): anything held over a folded wrapper unfolds it.
  const hover = useHoverOpen(wrapper && !subsOpen, () => setSubsToggled(true))
  // 2026-11-27: a wrapper drags too — its sub-names go to the name it is dropped on.
  const draggable = mergeable
  const many = n.descriptions.length
  const matched = (d: { key?: string; description: string }) =>
    (!!d.key && !!matches?.has(d.key)) || (query.length >= 2 && d.description.toLowerCase().includes(query))
  // A search that found it by a description opens it on that description.
  const open = toggled || (!!query && n.descriptions.some(matched))
  // step12 (2026-11-20): a wrapper counts its sub-names' exceptions too, and lists its own.
  const subDescriptions = wrapper ? subs.flatMap((sub) => subTools?.descriptionsOf?.(sub) ?? []) : []
  const exceptionTotal = exceptionCount(n.descriptions) + exceptionCount(subDescriptions)
  const [wrapperExceptions, setWrapperExceptions] = useState(false)
  const ownExceptions = n.descriptions.filter((d) => d.exceptions?.length)
  // "Unclarified name" is the server's key for the nameless rows: only its display is translated.
  const shownName = n.unclarified ? t('unclarifiedName') : n.name
  return (
    <li
      id={rowId(n.name)}
      {...(draggable ? nameDragProps(n.name) : {})}
      {...joinDragProps(joinDragProps(drop.props, refuse.props), hover.props)}
      title={draggable ? t('row.dragTitle') : undefined}
      className={cn(
        'px-5 py-3 transition-colors',
        draggable && 'cursor-grab active:cursor-grabbing',
        drop.over && !refuse.over && 'bg-brand/10 ring-2 ring-brand/40 ring-inset',
        refuse.over && 'cursor-not-allowed bg-muted/50',
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
            // step9 (2026-11-19): a name with sub-names opens ALL its rows too (its sub-names' included); the
            // sub-names unfold from the "N sub-names" link under it.
            <button
              type="button"
              onClick={onOpen}
              title={t(subs.length > 0 ? 'row.seeAllWithSubs' : 'row.seeAll', { name: shownName })}
              className={cn(
                'inline-flex max-w-full items-center gap-1 text-left font-medium text-[#0B1C2C] hover:text-brand hover:underline',
                n.unclarified && 'italic',
              )}
            >
              <span className="truncate">{shownName}</span>
            </button>
          ) : (
            <p className="truncate font-medium text-[#0B1C2C]">{shownName}</p>
          )}
        </RenameName>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {n.unclarified ? (
            <Badge className="bg-orange-100 text-orange-800">{t('row.badgeUnrecognized')}</Badge>
          ) : wrapper ? (
            <span className="text-xs text-muted-foreground" title={t('row.settingsOnSubs')}>
              {t('row.groupOf', { count: subs.length })}
            </span>
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
          {!wrapper && n.rule && <Badge className="bg-brand/10 text-brand">{t('edited')}</Badge>}
          {!wrapper && (
            <span className="truncate text-sm text-muted-foreground">
              {n.category}
              {n.otherCategories > 0 && t('plusMore', { count: n.otherCategories })}
            </span>
          )}
          <span className="text-xs text-muted-foreground/80 tabular-nums">· {rowsLabel(n.rows)}</span>
          <Total total={n.total} />
          {(wrapper ? [] : (n.fields ?? []))
            .filter((f) => f.kind === 'PHONE' || f.kind === 'EMAIL')
            .slice(0, 3)
            .map((f, i) => {
              const Icon = FIELD_KIND_ICON[f.kind]
              return (
                <a
                  key={`${i}:${f.value}`}
                  href={fieldHref(f) ?? undefined}
                  draggable={false}
                  title={t('fieldTitle', { label: f.label || fieldKindLabel(f.kind), value: f.value })}
                  className="inline-flex max-w-44 items-center gap-1 truncate text-xs text-muted-foreground hover:text-brand"
                >
                  <Icon className="size-3 shrink-0" />
                  <span className="truncate">{f.value}</span>
                </a>
              )
            })}
          {exceptionTotal > 0 && (
            <button
              type="button"
              onClick={() => {
                if (!wrapper) return setOpen(true)
                setWrapperExceptions(!wrapperExceptions)
                if (!subsOpen) toggleSubs()
              }}
              className="text-xs font-medium text-amber-700 hover:underline"
              title={t(wrapper ? 'row.exceptionsWrapperTitle' : 'row.exceptionsTitle')}
            >
              · {t('exceptionCount', { count: exceptionTotal })}
            </button>
          )}
        </div>
        <ExceptionOfLines items={n.exceptionOf ?? []} onGoTo={onGoTo} onOpenDescription={onOpenDescription} />
        {wrapper && wrapperExceptions && ownExceptions.length > 0 && (
          <ul className="mt-1 flex flex-col gap-0.5 rounded-lg bg-amber-50/60 p-1.5 text-xs">
            {ownExceptions.map((d) => (
              <li key={d.key ?? d.description}>
                <DescriptionLink description={d.description} onOpen={onOpenDescription} className="text-[#0B1C2C]">
                  “{d.description}”
                </DescriptionLink>
                <ExceptionList exceptions={d.exceptions ?? []} onGoTo={onGoTo} />
              </li>
            ))}
          </ul>
        )}
        {!wrapper && !open && (
          <DescriptionsLine descriptions={n.descriptions} onOpen={onOpenDescription} onMore={() => setOpen(true)} />
        )}
        {wrapper && !subsOpen && (
          <SubDescriptionsLine
            parent={n.name}
            entries={subs.flatMap((sub) => [
              ...(subTools?.containsOf?.(sub) ?? []).map((c) => ({ sub: sub.name, key: c.key, description: c.text, contains: true })),
              ...(subTools?.descriptionsOf?.(sub) ?? []).map((d) => ({ sub: sub.name, key: d.key, description: d.description })),
            ])}
            onOpen={onOpenDescription}
            onMore={toggleSubs}
          />
        )}
        {subs.length > 0 && (
          <button
            type="button"
            onClick={toggleSubs}
            aria-expanded={subsOpen}
            className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            <CornerDownRight className="size-3.5" />
            {subsOpen ? t('row.hideSubs') : t('row.subNames', { count: subs.length })}
            <ChevronDown className={cn('size-3.5 transition-transform', subsOpen && 'rotate-180')} />
          </button>
        )}
        {refuse.over && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('row.alreadyUnder', { name: n.name })}
          </p>
        )}
        {subsOpen && (
          <div className="mt-1 ml-1 space-y-0.5 border-l-2 border-brand/20 pl-3">
            {subs.map((sub) => (
              <SubNameLine
                key={sub.id}
                id={rowId(sub.name)}
                highlighted={highlight === sub.name.toLowerCase()}
                sub={sub}
                onOpen={onOpenSubName && (() => onOpenSubName(sub))}
                tools={subTools}
                removable={subs.length === 1}
                matched={matched}
              />
            ))}
          </div>
        )}
      </div>
      {!wrapper && agencies.length > 0 && (
        <AgencyPicker
          name={n.name}
          agencies={agencies}
          picked={n.agencyIds}
          alone={n.agencyAlone}
          rows={n.rows}
          pending={pending}
          onChange={onAgencies}
        />
      )}
      {!wrapper && (
      <div className="flex shrink-0 gap-1">
        {onFiles && <FolderButton name={n.name} counts={files} onOpen={onFiles} />}
        {many > 0 && (
          <Button
            variant="ghost"
            size="icon-sm"
            title={open ? t('row.hideDescriptions') : t('row.showDescriptions')}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
          </Button>
        )}
        {!n.unclarified && (
          <Button variant="ghost" size="icon-sm" title={t('row.edit', { name: n.name })} onClick={onEdit}>
            <Pencil />
          </Button>
        )}
        {n.rule && <ResetButton onReset={onReset} resetting={resetting} />}
      </div>
      )}
      </div>
      {open && unrecognized && <UnrecognizedRows query={query} matched={matched} onAssign={onAssign} />}
      {open && !unrecognized && !wrapper && (
        <ul className="mt-2 ml-13 flex flex-col gap-1 rounded-lg bg-muted/40 p-2">
          {(n.followsContains ?? []).map((c) => (
            <li key={`c:${c.key}`} className="flex items-center gap-3 px-2 py-1 text-sm">
              <ListFilter className="size-3.5 shrink-0 text-brand" />
              <span className="min-w-0 flex-1 truncate text-[#0B1C2C]">
                <Trans
                  t={t}
                  i18nKey="row.containing"
                  values={{ text: c.text }}
                  components={{ b: <span className="font-medium" /> }}
                />
              </span>
              <span className="w-14 shrink-0 text-right text-xs text-muted-foreground/80 tabular-nums">
                {rowsLabel(c.rows)}
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
                  title={d.key ? t('row.dragDescription') : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded px-2 py-1 text-sm',
                    d.key && 'cursor-grab active:cursor-grabbing',
                    matched(d) && 'bg-amber-100/70',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-[#0B1C2C]" title={d.description}>
                    <DescriptionLink description={d.description} onOpen={onOpenDescription}>
                      {d.description}
                    </DescriptionLink>
                  </span>
                  {d.rule && (
                    <span
                      className="shrink-0 text-xs text-brand"
                      title={d.rule.subName ? t('row.ruleFromSplit', { sub: d.rule.subName }) : t('row.ruleTies')}
                    >
                      {d.rule.matchType === 'CONTAINS' ? t('contains', { text: d.rule.text }) : t('yourRule')}
                      {d.rule.subName && ` → ${d.rule.subName}`}
                    </span>
                  )}
                  {exRows > 0 && (
                    <button
                      type="button"
                      onClick={() => setExceptionsOf(exceptionsOf === id ? null : id)}
                      className="shrink-0 text-xs font-medium text-amber-700 hover:underline"
                      title={t('row.descriptionExceptionsTitle')}
                    >
                      {t('exceptionCount', { count: exRows })}
                    </button>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">{d.category}</span>
                  <span className="w-14 shrink-0 text-right text-xs text-muted-foreground/80 tabular-nums">
                    {rowsLabel(d.rows)}
                  </span>
                </div>
                {exceptionsOf === id && <ExceptionList exceptions={exceptions} onGoTo={onGoTo} />}
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
  const { t } = useTranslation(['names', 'common'])
  const gives = [rule.name, rule.category].filter(Boolean).join(' · ')
  return (
    <li className="flex items-center gap-4 px-5 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
        <ListFilter className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[#0B1C2C]" title={rule.text}>
          {t('containsRule.title', { text: rule.text })}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <Badge className="bg-brand/10 text-brand">{t('containsRule.badge')}</Badge>
          <span className="truncate text-sm text-muted-foreground">→ {gives}</span>
          <span className="text-xs text-muted-foreground/80 tabular-nums">· {rowsLabel(rule.rows)}</span>
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon-sm" title={t('containsRule.edit')} onClick={onEdit}>
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title={t('containsRule.delete')}
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
  const { t } = useTranslation(['names', 'common'])
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      title={t('resetToDefault')}
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
  const { t } = useTranslation(['names', 'common'])
  if (!onRename) return <>{children}</>
  return (
    <InlineRename value={name} onSave={onRename} label={t('rename', { name })}>
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
  const { t } = useTranslation(['names', 'common'])
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
            <DialogTitle>{t('addName.title')}</DialogTitle>
            <DialogDescription>{t('addName.text')}</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            maxLength={191}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('addName.placeholder')}
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
            <DialogClose render={<Button type="button" variant="outline" />}>{t('common:actions.cancel')}</DialogClose>
            <Button type="submit" disabled={!name.trim() || add.isPending} className="bg-brand text-white hover:bg-brand/85">
              {t('addName.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}



/** step11 (2026-11-23): the Unclarified row opened — its nameless descriptions, loaded from the server now. */
function UnrecognizedRows({
  query,
  matched,
  onAssign,
}: {
  query: string
  matched: (d: { key?: string; description: string }) => boolean
  onAssign: (u: UnrecognizedName) => void
}) {
  const { t } = useTranslation(['names', 'common'])
  const list = useUnrecognized(query)
  return (
    <div className="mt-2 ml-13 rounded-lg bg-muted/40 p-2">
      {list.isPending ? (
        <Skeleton className="h-10" />
      ) : (
        <UnclarifiedTable
          rows={list.data ?? []}
          highlighted={(u) => matched({ key: u.key, description: u.sampleDescription })}
          actions={(u) => (
            <Button variant="outline" size="xs" onClick={() => onAssign(u)}>
              {t('assign')}
            </Button>
          )}
        />
      )}
    </div>
  )
}
