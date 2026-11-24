import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { NameGroup, SubName, TaxAgency } from '@/api/bookkeeping'
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
import { localGroup } from '@/hooks/useNameGroups'
import { useSetSubNameSettings } from '@/hooks/useSplits'
import { AgencyPicker } from './AgencyPicker'
import { GroupPicker } from './GroupPicker'
import { NameColumnAnswersSection } from './NameColumnAnswers'
import { NameFieldsEditor } from './NameFieldsEditor'

/**
 * step9 part 3 (2026-11-15, user: "a subname should have all the settings like a regular name
 * has"): a sub-name's own name, group, split rules and profile. Its category is changed on
 * its line (every row of it moves); its files are in its own folder (the folder icon).
 */
export function SubNameDialog({
  sub,
  open,
  onOpenChange,
  groups,
  parentGroup,
  agencies,
  parentAgencyIds,
}: {
  sub: SubName
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: NameGroup[]
  parentGroup: string
  agencies: TaxAgency[]
  parentAgencyIds: number[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {open && (
          <SubNameSettings
            key={sub.id}
            sub={sub}
            groups={groups}
            parentGroup={parentGroup}
            agencies={agencies}
            parentAgencyIds={parentAgencyIds}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * The sub-name's settings. step12 (2026-11-20): also shown INSIDE the ledger's name window
 * (`inline`) — a plain block with its own Save there, since it sits inside that window's form.
 */
export function SubNameSettings({
  sub,
  groups,
  parentGroup,
  agencies,
  parentAgencyIds,
  onDone,
  inline = false,
}: {
  sub: SubName
  groups: NameGroup[]
  parentGroup: string
  agencies: TaxAgency[]
  parentAgencyIds: number[]
  onDone?: () => void
  inline?: boolean
}) {
  const { t } = useTranslation(['names', 'common'])
  const save = useSetSubNameSettings()
  const fields = useSetSubNameSettings()
  const [name, setName] = useState(sub.name)
  const [group, setGroup] = useState<string | null>(sub.group)
  const [own, setOwn] = useState(sub.ownAgencies)
  const [picked, setPicked] = useState(sub.ownAgencies ? sub.agencyIds : parentAgencyIds)
  const [alone, setAlone] = useState(sub.ownAgencies && sub.agencyAlone)
  const [saved, setSaved] = useState(false)
  const labelOf = (key: string) => localGroup(groups.find((g) => g.key === key) ?? { key, label: key }).label
  const nameId = inline ? 'sub-inline-name' : 'sub-name'
  const changed = () => setSaved(false)

  const submit = () =>
    save.mutate(
      {
        id: sub.id,
        ...(name.trim() !== sub.name && { name: name.trim() }),
        ...(group !== sub.group && { group }),
        agencyIds: own ? picked : null,
        ...(own && alone && { alone }),
      },
      {
        onSuccess: () => {
          setSaved(true)
          onDone?.()
        },
      },
    )

  const body = (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={nameId}>{inline ? t('subDialog.ownName') : t('subDialog.name')}</Label>
        <Input
          id={nameId}
          value={name}
          maxLength={191}
          onChange={(e) => {
            setName(e.target.value)
            changed()
          }}
        />
        {sub.renamed && (
          <button
            type="button"
            onClick={() => {
              setName('')
              changed()
            }}
            className="self-start text-xs font-medium text-brand hover:underline"
          >
            {t('subDialog.useAutoName', { name: `${sub.parent} - ${sub.category}` })}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{t('subDialog.group')}</Label>
        <GroupPicker
          groups={groups}
          value={group ?? parentGroup}
          onChange={(g) => {
            setGroup(g)
            changed()
          }}
        />
        <p className="text-xs text-muted-foreground">
          {group === null ? t('subDialog.sameAs', { parent: sub.parent, group: labelOf(parentGroup) }) : (
            <button
              type="button"
              onClick={() => {
                setGroup(null)
                changed()
              }}
              className="font-medium text-brand hover:underline"
            >
              {t('subDialog.sameGroupAgain', { parent: sub.parent })}
            </button>
          )}
        </p>
      </div>

      {agencies.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label className="flex items-center gap-2.5">
            <Switch
              checked={own}
              onCheckedChange={(v) => {
                setOwn(v)
                changed()
                if (!v) {
                  setPicked(parentAgencyIds)
                  setAlone(false)
                }
              }}
              className="data-checked:bg-brand"
            />
            {t('subDialog.ownSplitRules')}
          </Label>
          {own ? (
            <>
              <AgencyPicker
                name={name || sub.name}
                agencies={agencies}
                picked={picked}
                alone={alone}
                pending={false}
                onChange={(ids, a) => {
                  setPicked(ids)
                  setAlone(a)
                  changed()
                }}
                draft
              />
              <p className="text-xs text-muted-foreground">
                {t('subDialog.splitsRows', { count: sub.rows })}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {parentAgencyIds.length
                ? t('subDialog.splitLike', {
                    parent: sub.parent,
                    rules: agencies
                      .filter((a) => parentAgencyIds.includes(a.id))
                      .map((a) => a.name)
                      .join(', '),
                  })
                : t('subDialog.splitLikeNone', { parent: sub.parent })}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>{t('subDialog.details')}</Label>
        <NameFieldsEditor
          fields={sub.fields}
          pending={fields.isPending}
          error={fields.error}
          onChange={(next) => fields.mutateAsync({ id: sub.id, fields: next })}
        />
      </div>

      <NameColumnAnswersSection target={{ subNameId: sub.id }} />

      {save.error && <p className="text-sm text-red-600">{save.error.message}</p>}
    </>
  )

  if (inline) {
    return (
      <div className="flex flex-col gap-3">
        {body}
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={save.isPending} onClick={submit}>
            {save.isPending ? t('common:actions.saving') : t('subDialog.saveSettings')}
          </Button>
          {saved && !save.isPending && <span className="text-xs text-emerald-700">{t('subDialog.saved')}</span>}
        </div>
      </div>
    )
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>{t('subDialog.title', { name: sub.name })}</DialogTitle>
        <DialogDescription>{t('subDialog.text', { parent: sub.parent, category: sub.category })}</DialogDescription>
      </DialogHeader>
      {body}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('common:actions.cancel')}</DialogClose>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? t('common:actions.saving') : t('common:actions.save')}
        </Button>
      </DialogFooter>
    </form>
  )
}
