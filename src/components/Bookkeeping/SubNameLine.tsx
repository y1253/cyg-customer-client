import { useState, type ReactNode } from 'react'
import { CornerDownRight, Pencil, X } from 'lucide-react'
import type { NameGroup, SubName, TaxAgency } from '@/api/bookkeeping'
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
import { InlineRename } from './InlineRename'
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
 */
export function SubNameLine({ sub, onOpen, tools }: { sub: SubName; onOpen?: () => void; tools?: SubNameTools }) {
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
  const nameButton = onOpen ? (
    <button type="button" onClick={onOpen} className="min-w-0 truncate font-medium text-[#0B1C2C] hover:underline" title="See its rows">
      {sub.name}
    </button>
  ) : (
    <span className="min-w-0 truncate font-medium text-[#0B1C2C]">{sub.name}</span>
  )
  return (
    <div className="mt-0.5 text-xs">
      <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
        <CornerDownRight className="size-3.5 shrink-0 text-brand/60" />
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
        <button
          type="button"
          onClick={() => remove.mutate(sub.id)}
          disabled={remove.isPending}
          title="Remove this sub-name — its rows go back to the name's category"
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
        >
          <X className="size-3.5" />
        </button>
      </div>
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
