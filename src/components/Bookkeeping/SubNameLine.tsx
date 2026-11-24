import { useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { ChevronDown, CornerDownRight, GripVertical, Pencil, X } from 'lucide-react'
import type { MergeEnd, NameDescription, NameExceptionOf, NameGroup, SubName, TaxAgency } from '@/api/bookkeeping'
import { Button } from '@/components/ui/button'
import { useCreateAccount } from '@/hooks/useCreateAccount'
import { useDeleteSubName, useSetSubNameCategory, useSetSubNameSettings } from '@/hooks/useSplits'
import { categoryChoice, choiceReady, resolveChoice } from '@/lib/categoryChoice'
import { currentLocale } from '@/i18n'
import { money } from '@/lib/money'
import { exceptionCount } from '@/lib/name-exceptions'
import { FIELD_KIND_ICON, fieldHref, fieldKindLabel } from '@/lib/name-fields'
import type { BucketCounts, BucketFilter } from '@/lib/name-files'
import { cn } from '@/lib/utils'
import { AgencyPicker } from './AgencyPicker'
import { CategoryField } from './CategoryField'
import { DescriptionLink, DescriptionsLine } from './DescriptionsLine'
import { ExceptionList, ExceptionOfLines } from './Exceptions'
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
  /** step11 (2026-11-23): opens only THIS sub-name's rows of the description. */
  onOpenDescription?: (description: string, sub: SubName) => void
  /** step9 (2026-11-17, third request): its "description contains" rules. */
  containsOf?: (sub: SubName) => Array<{ key: string; text: string; category: string | null; rows: number }>
  /** step9 (2026-11-17, third request): a name or another sub-name was dropped on it. */
  onMergeInto?: (sub: SubName, from: MergeEnd) => void
  /** step12 (2026-11-20): its rows that are exceptions from another name / sub-name. */
  exceptionOf?: (sub: SubName) => NameExceptionOf[]
  /** step12 (2026-11-20): an exception's link — to the name / sub-name it names. */
  onGoTo?: (name: string) => void
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
  id,
  highlighted,
}: {
  sub: SubName
  onOpen?: () => void
  tools?: SubNameTools
  removable?: boolean
  /** The Names-tab search: a description it found is shown open and marked. */
  matched?: (d: { key?: string; description: string }) => boolean
  /** step12 (2026-11-20): where an exception link scrolls to, and the flash when it does. */
  id?: string
  highlighted?: boolean
}) {
  const { t } = useTranslation(['names', 'common'])
  const rowsLabel = (n: number) => t('rows', { count: n, n: n.toLocaleString(currentLocale()) })
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
  const openDescription = own?.onOpenDescription && ((d: string) => own.onOpenDescription!(d, sub))
  const descriptions = own?.descriptionsOf?.(sub) ?? []
  const contains = own?.containsOf?.(sub) ?? []
  const exceptionOf = own?.exceptionOf?.(sub) ?? []
  const exceptions = exceptionCount(descriptions)
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
    <button type="button" onClick={onOpen} className="min-w-0 truncate font-medium text-[#0B1C2C] hover:underline" title={t('subName.seeRows')}>
      {sub.name}
    </button>
  ) : (
    <span className="min-w-0 truncate font-medium text-[#0B1C2C]">{sub.name}</span>
  )
  return (
    <div
      id={id}
      {...drop.props}
      className={cn(
        'mt-0.5 rounded text-xs',
        highlighted && 'bg-amber-50',
        drop.over && 'bg-brand/10 ring-2 ring-brand/40 ring-inset',
      )}
      title={
        own?.onDescription ? t('subName.dropTitle') : undefined
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
          <GripVertical className="size-3.5 shrink-0 text-muted-foreground/60" aria-label={t('subName.dragToMerge')} />
        ) : (
          <CornerDownRight className="size-3.5 shrink-0 text-brand/60" />
        )}
        {own ? (
          <InlineRename
            value={sub.name}
            label={t('rename', { name: sub.name })}
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
          title={t('subName.categoryTitle')}
          className="shrink-0 rounded-md bg-brand/10 px-1.5 py-0.5 font-medium text-brand hover:bg-brand/15"
        >
          {sub.category}
        </button>
        <span className="shrink-0 tabular-nums">· {rowsLabel(sub.rows)}</span>
        {descriptions.length + contains.length > 0 && (
          <button
            type="button"
            onClick={() => setDescToggled(!descOpen)}
            title={descOpen ? t('subName.hideItsDescriptions') : t('subName.showItsDescriptions')}
            className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800 tabular-nums hover:bg-amber-200"
          >
            {t('descriptionCount', { count: descriptions.length + contains.length })}
          </button>
        )}
        {exceptions > 0 && (
          <button
            type="button"
            onClick={() => setDescToggled(true)}
            title={t('subName.exceptionsTitle')}
            className="shrink-0 font-medium text-amber-700 hover:underline"
          >
            · {t('exceptionCount', { count: exceptions })}
          </button>
        )}
        <span
          className={cn('shrink-0 font-medium tabular-nums', sub.total < 0 ? 'text-red-600' : 'text-emerald-700')}
          title={t('subName.totalTitle')}
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
                  title={t('fieldTitle', { label: f.label || fieldKindLabel(f.kind), value: f.value })}
                  className="inline-flex max-w-40 shrink-0 items-center gap-1 truncate hover:text-brand"
                >
                  <Icon className="size-3 shrink-0" />
                  <span className="truncate">{f.value}</span>
                </a>
              )
            })}
        {own && own.agencies.length > 0 && (
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {!sub.ownAgencies && (
              <span className="text-[11px] text-muted-foreground/80">{t('subName.asParent', { parent: sub.parent })}</span>
            )}
            <AgencyPicker
              name={sub.name}
              agencies={own.agencies}
              picked={sub.ownAgencies ? sub.agencyIds : own.parentAgencyIds}
              alone={sub.ownAgencies && sub.agencyAlone}
              rows={sub.rows}
              pending={settings.isPending && settings.variables?.agencyIds !== undefined}
              onChange={(agencyIds, alone) => settings.mutate({ id: sub.id, agencyIds, alone })}
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
                title={descOpen ? t('subName.hideDescriptions') : t('subName.showDescriptions')}
                aria-expanded={descOpen}
                onClick={() => setDescToggled(!descOpen)}
              >
                <ChevronDown className={cn('transition-transform', descOpen && 'rotate-180')} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              title={t('subName.edit', { name: sub.name })}
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
            title={t('subName.remove')}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <ExceptionOfLines
        className="ml-5"
        items={exceptionOf}
        onGoTo={own?.onGoTo}
        onOpenDescription={openDescription}
      />
      {!descOpen && (
        <DescriptionsLine
          className="ml-5"
          descriptions={descriptions}
          contains={contains.map((c) => c.text)}
          onOpen={openDescription}
          onMore={() => setDescToggled(true)}
        />
      )}
      {descOpen && descriptions.length + contains.length > 0 && (
        <ul className="mt-1 ml-5 flex flex-col gap-0.5 rounded-lg bg-muted/40 p-1.5">
          {contains.map((c) => (
            <li key={`c:${c.key}`} className="flex items-center gap-3 rounded px-2 py-0.5">
              <span className="min-w-0 flex-1 truncate text-[#0B1C2C]">
                <Trans
                  t={t}
                  i18nKey="subName.contains"
                  values={{ text: c.text }}
                  components={{ b: <span className="font-medium" /> }}
                />
              </span>
              <span className="shrink-0 text-brand">{t('yourRule')}</span>
              <span className="shrink-0 text-muted-foreground">{c.category ?? sub.category}</span>
              <span className="w-14 shrink-0 text-right text-muted-foreground/80 tabular-nums">
                {rowsLabel(c.rows)}
              </span>
            </li>
          ))}
          {descriptions.map((d) => (
            <li key={d.key ?? d.description}>
              <div
                {...(d.key && own?.onDescription ? descriptionDragProps(d.key, d.description) : {})}
                title={d.key ? t('subName.dragDescription') : undefined}
                className={cn(
                  'flex items-center gap-3 rounded px-2 py-0.5',
                  d.key && own?.onDescription && 'cursor-grab active:cursor-grabbing',
                  matched?.(d) && 'bg-amber-100/70',
                )}
              >
                <span className="min-w-0 flex-1 truncate text-[#0B1C2C]" title={d.description}>
                  <DescriptionLink description={d.description} onOpen={openDescription}>
                    {d.description}
                  </DescriptionLink>
                </span>
                {d.rule && (
                  <span className="shrink-0 text-brand" title={t('subName.ruleTitle')}>
                    {d.rule.matchType === 'CONTAINS' ? t('contains', { text: d.rule.text }) : t('yourRule')}
                  </span>
                )}
                <span className="shrink-0 text-muted-foreground">{d.category}</span>
                <span className="w-14 shrink-0 text-right text-muted-foreground/80 tabular-nums">
                  {d.rows ? rowsLabel(d.rows) : t('noRowsYet')}
                </span>
              </div>
              {!!d.exceptions?.length && <ExceptionList exceptions={d.exceptions} onGoTo={own?.onGoTo} />}
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
              {t('common:actions.save')}
            </Button>
            <Button type="button" size="xs" variant="ghost" onClick={() => setEditing(false)}>
              {t('common:actions.cancel')}
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
