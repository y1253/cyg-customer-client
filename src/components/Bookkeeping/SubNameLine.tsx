import { useState, type ReactNode } from 'react'
import { ChevronDown, CornerDownRight, GripVertical, Pencil, X } from 'lucide-react'
import type { MergeEnd, NameDescription, NameGroup, SubName, TaxAgency } from '@/api/bookkeeping'
import { Button } from '@/components/ui/button'
import { useCreateAccount } from '@/hooks/useCreateAccount'
import { useDeleteSubName, useSetSubNameCategory, useSetSubNameSettings } from '@/hooks/useSplits'
import { categoryChoice, choiceReady, resolveChoice } from '@/lib/categoryChoice'
import { money } from '@/lib/money'
import { FIELD_KIND_ICON, FIELD_KIND_LABEL, fieldHref } from '@/lib/name-fields'
import type { BucketCounts, BucketFilter } from '@/lib/name-files'
import { cn } from '@/lib/utils'
import { AgencyPicker } from './AgencyPicker'
import { CategoryField } from './CategoryField'
import { DescriptionLink, DescriptionsLine } from './DescriptionsLine'
import { InlineRename } from './InlineRename'
import { descriptionDragProps, subNameDragProps, useNameDrop } from './name-drag'
import { FolderButton } from './NameFiles/FileCounts'
import { SubNameDialog } from './SubNameDialog'

/**
 * step9 part 3: what a sub-name line needs from its parent's row to show the settings a name
 * has — its group chip (drawn by the Names tab), the split rules, its folder.
 */
export type SubNameTools = {
  groups: NameGroup[]
  parentGroup: string
  agencies: TaxAgency[]
  parentAgencyIds: number[]
  groupChip: (sub: SubName, group: string, pending: boolean, onGroup: (key: string) => void) => ReactNode
  files: (name: string) => BucketCounts
  onFiles: (name: string, filter: BucketFilter) => void
  /**
   * step9 (2026-11-17, second request): its parent is only a wrapper — the sub-name holds the
   * descriptions, and a description dropped on it is filed under it (a DESCRIPTION rule).
   */
  descriptionsOf?: (sub: SubName) => NameDescription[]
  onDescription?: (sub: SubName, d: { key: string; description: string }) => void
  onOpenDescription?: (description: string) => void
  /** step9 (2026-11-17, third request): its "description contains" rules. */
  containsOf?: (sub: SubName) => Array<{ key: string; text: string; category: string | null; rows: number }>
  /** step9 (2026-11-17, third request): a name or another sub-name was dropped on it. */
  onMergeInto?: (sub: SubName, from: MergeEnd) => void
}

/**
 * step2 (2026-11-15): one sub-name under its name on the Names tab ("Walmart - Maintenance"):
 * splits put in another category "only for this". Its category can be changed (every row of
 * it moves) and it can be removed (its rows go back to the name's category). Its rows are
 * still the name's — they count in the name's totals.
 * step9 (2026-11-15): with its total. step9 part 4: a split rule's splits ("Walmart - GST") are a sub-name
 * like any other.
 * step9 part 3: every setting a name has — rename in place, its group, its split rules (its
 * parent's until it has its own), its folder, its details (the Edit dialog).
 * step9 (2026-11-17, second request): and its descriptions — dragged out of it or dropped on
 * it. Only its parent's last sub-name can be removed (the parent is a regular name again).
 * step9 (2026-11-17, third request): like a name — dragged onto a name, a sub-name or a group,
 * a name or sub-name dropped on it merges into it, and "Descriptions: …" shows under it.
 */
export function SubNameLine({
  sub,
  onOpen,
  tools,
  removable = true,
  matched,
}: {
  sub: SubName
  onOpen?: () => void
  tools?: SubNameTools
  removable?: boolean
  /** The Names-tab search: a description it found is shown open and marked. */
  matched?: (d: { key?: string; description: string }) => boolean
}) {
  const set = useSetSubNameCategory()
  const settings = useSetSubNameSettings()
  const [dialog, setDialog] = useState(false)
  const remove = useDeleteSubName()
  const create = useCreateAccount()
  const [editing, setEditing] = useState(false)
  const [choice, setChoice] = useState(categoryChoice(sub.category))
  const save = async () => {
    const category = await resolveChoice(choice, create)
    if (!category) return
    set.mutate({ id: sub.id, category }, { onSuccess: () => setEditing(false) })
  }
  const error = set.error ?? remove.error ?? create.error ?? settings.error
  const own = tools ?? null
  const descriptions = own?.descriptionsOf?.(sub) ?? []
  const contains = own?.containsOf?.(sub) ?? []
  const [descToggled, setDescToggled] = useState(false)
  const descOpen = descToggled || (!!matched && descriptions.some(matched))
  const merge = own?.onMergeInto
  // step9 (2026-11-18): every sub-name drags — a split rule's ("Walmart - GST") too.
  const draggable = !!merge
  const drop = useNameDrop(
    sub.name,
    merge && ((from) => merge(sub, { name: from })),
    own?.onDescription && ((d) => own.onDescription!(sub, d)),
    merge && ((from) => from.id !== sub.id && merge(sub, { name: from.name, subId: from.id })),
  )
  const nameButton = onOpen ? (
    <button type="button" onClick={onOpen} className="min-w-0 truncate font-medium text-[#0B1C2C] hover:underline" title="See its rows">
      {sub.name}
    </button>
  ) : (
    <span className="min-w-0 truncate font-medium text-[#0B1C2C]">{sub.name}</span>
  )
  return (
    <div
      {...drop.props}
      className={cn('mt-0.5 rounded text-xs', drop.over && 'bg-brand/10 ring-2 ring-brand/40 ring-inset')}
      title={
        own?.onDescription
          ? 'Drag it onto a name or another sub-name to merge them — or drop a name, a sub-name or a description here'
          : undefined
      }
    >
      <div
        {...(draggable ? subNameDragProps(sub) : {})}
        className={cn(
          'flex min-w-0 items-center gap-1.5 text-muted-foreground',
          draggable && 'cursor-grab active:cursor-grabbing',
        )}
      >
        {draggable ? (
          <GripVertical className="size-3.5 shrink-0 text-muted-foreground/60" aria-label="Drag to merge" />
        ) : (
          <CornerDownRight className="size-3.5 shrink-0 text-brand/60" />
        )}
        {own ? (
          <InlineRename
            value={sub.name}
            label={`Rename ${sub.name}`}
            className="min-w-0 flex-none"
            onSave={(name) => settings.mutateAsync({ id: sub.id, name })}
          >
            {nameButton}
          </InlineRename>
        ) : (
          nameButton
        )}
        {own &&
          own.groupChip(
            sub,
            sub.group ?? own.parentGroup,
            settings.isPending && settings.variables?.group !== undefined,
            (group) => group !== (sub.group ?? own.parentGroup) && settings.mutate({ id: sub.id, group }),
          )}
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          title="Change this sub-name's category — every row of it moves"
          className="shrink-0 rounded-md bg-brand/10 px-1.5 py-0.5 font-medium text-brand hover:bg-brand/15"
        >
          {sub.category}
        </button>
        <span className="shrink-0 tabular-nums">
          · {sub.rows} row{sub.rows === 1 ? '' : 's'}
        </span>
        {descriptions.length + contains.length > 0 && (
          <button
            type="button"
            onClick={() => setDescToggled(!descOpen)}
            title={descOpen ? 'Hide its descriptions' : 'Show its descriptions'}
            className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800 tabular-nums hover:bg-amber-200"
          >
            {descriptions.length + contains.length} description{descriptions.length + contains.length === 1 ? '' : 's'}
          </button>
        )}
        <span
          className={cn('shrink-0 font-medium tabular-nums', sub.total < 0 ? 'text-red-600' : 'text-emerald-700')}
          title="Total of this sub-name"
        >
          · {money(sub.total ?? 0)}
        </span>
        {own &&
          sub.fields
            .filter((f) => f.kind === 'PHONE' || f.kind === 'EMAIL')
            .slice(0, 2)
            .map((f, i) => {
              const Icon = FIELD_KIND_ICON[f.kind]
              return (
                <a
                  key={`${i}:${f.value}`}
                  href={fieldHref(f) ?? undefined}
                  draggable={false}
                  title={`${f.label || FIELD_KIND_LABEL[f.kind]}: ${f.value}`}
                  className="inline-flex max-w-40 shrink-0 items-center gap-1 truncate hover:text-brand"
                >
                  <Icon className="size-3 shrink-0" />
                  <span className="truncate">{f.value}</span>
                </a>
              )
            })}
        {own && own.agencies.length > 0 && (
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {!sub.ownAgencies && <span className="text-[11px] text-muted-foreground/80">as {sub.parent}:</span>}
            <AgencyPicker
              name={sub.name}
              agencies={own.agencies}
              picked={sub.ownAgencies ? sub.agencyIds : own.parentAgencyIds}
              rows={sub.rows}
              pending={settings.isPending && settings.variables?.agencyIds !== undefined}
              onChange={(agencyIds) => settings.mutate({ id: sub.id, agencyIds })}
            />
          </span>
        )}
        {own && (
          <span className={cn('flex shrink-0 items-center gap-0.5', own.agencies.length === 0 && 'ml-auto')}>
            <FolderButton name={sub.name} counts={own.files(sub.name)} onOpen={(f) => own.onFiles(sub.name, f)} />
            {descriptions.length + contains.length > 0 && (
              <Button
                variant="ghost"
                size="icon-xs"
                title={descOpen ? 'Hide descriptions' : 'Show the descriptions under this sub-name'}
                aria-expanded={descOpen}
                onClick={() => setDescToggled(!descOpen)}
              >
                <ChevronDown className={cn('transition-transform', descOpen && 'rotate-180')} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              title={`Edit ${sub.name} — its name, group, split rules and details`}
              onClick={() => setDialog(true)}
            >
              <Pencil />
            </Button>
          </span>
        )}
        {removable && (
          <button
            type="button"
            onClick={() => remove.mutate(sub.id)}
            disabled={remove.isPending}
            title="Remove this sub-name — its rows go back to the name's category"
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {!descOpen && (
        <DescriptionsLine
          className="ml-5"
          descriptions={descriptions}
          contains={contains.map((c) => c.text)}
          onOpen={own?.onOpenDescription}
          onMore={() => setDescToggled(true)}
        />
      )}
      {descOpen && descriptions.length + contains.length > 0 && (
        <ul className="mt-1 ml-5 flex flex-col gap-0.5 rounded-lg bg-muted/40 p-1.5">
          {contains.map((c) => (
            <li key={`c:${c.key}`} className="flex items-center gap-3 rounded px-2 py-0.5">
              <span className="min-w-0 flex-1 truncate text-[#0B1C2C]">
                Description contains <span className="font-medium">“{c.text}”</span>
              </span>
              <span className="shrink-0 text-brand">your rule</span>
              <span className="shrink-0 text-muted-foreground">{c.category ?? sub.category}</span>
              <span className="w-14 shrink-0 text-right text-muted-foreground/80 tabular-nums">
                {c.rows.toLocaleString()} row{c.rows === 1 ? '' : 's'}
              </span>
            </li>
          ))}
          {descriptions.map((d) => (
            <li
              key={d.key ?? d.description}
              {...(d.key && own?.onDescription ? descriptionDragProps(d.key, d.description) : {})}
              title={d.key ? 'Drag onto another sub-name to move this description there' : undefined}
              className={cn(
                'flex items-center gap-3 rounded px-2 py-0.5',
                d.key && own?.onDescription && 'cursor-grab active:cursor-grabbing',
                matched?.(d) && 'bg-amber-100/70',
              )}
            >
              <span className="min-w-0 flex-1 truncate text-[#0B1C2C]" title={d.description}>
                <DescriptionLink description={d.description} onOpen={own?.onOpenDescription}>
                  {d.description}
                </DescriptionLink>
              </span>
              {d.rule && (
                <span className="shrink-0 text-brand" title="Your rule files it under this sub-name">
                  {d.rule.matchType === 'CONTAINS' ? `contains “${d.rule.text}”` : 'your rule'}
                </span>
              )}
              <span className="shrink-0 text-muted-foreground">{d.category}</span>
              <span className="w-14 shrink-0 text-right text-muted-foreground/80 tabular-nums">
                {d.rows ? `${d.rows.toLocaleString()} row${d.rows === 1 ? '' : 's'}` : 'no rows yet'}
              </span>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <div className="mt-1 ml-5 flex max-w-sm flex-col gap-1.5">
          <CategoryField value={choice} onChange={setChoice} />
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="xs"
              disabled={!choiceReady(choice) || choice.category === sub.category || set.isPending || create.isPending}
              onClick={() => void save()}
            >
              Save
            </Button>
            <Button type="button" size="xs" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {!!error && <p className="ml-5 text-red-600">{error.message}</p>}
      {own && (
        <SubNameDialog
          sub={sub}
          open={dialog}
          onOpenChange={setDialog}
          groups={own.groups}
          parentGroup={own.parentGroup}
          agencies={own.agencies}
          parentAgencyIds={own.parentAgencyIds}
        />
      )}
    </div>
  )
}
