import { useState } from 'react'
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
  const save = useSetSubNameSettings()
  const fields = useSetSubNameSettings()
  const [name, setName] = useState(sub.name)
  const [group, setGroup] = useState<string | null>(sub.group)
  const [own, setOwn] = useState(sub.ownAgencies)
  const [picked, setPicked] = useState(sub.ownAgencies ? sub.agencyIds : parentAgencyIds)
  const [alone, setAlone] = useState(sub.ownAgencies && sub.agencyAlone)
  const [saved, setSaved] = useState(false)
  const labelOf = (key: string) => groups.find((g) => g.key === key)?.label ?? key
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
        <Label htmlFor={nameId}>{inline ? 'Its own name' : 'Name'}</Label>
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
            Use “{sub.parent} - {sub.category}” again
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Group</Label>
        <GroupPicker
          groups={groups}
          value={group ?? parentGroup}
          onChange={(g) => {
            setGroup(g)
            changed()
          }}
        />
        <p className="text-xs text-muted-foreground">
          {group === null ? `Same as ${sub.parent} (${labelOf(parentGroup)}).` : (
            <button
              type="button"
              onClick={() => {
                setGroup(null)
                changed()
              }}
              className="font-medium text-brand hover:underline"
            >
              Same group as {sub.parent} again
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
            Its own split rules
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
                A rule added splits its {sub.rows} row{sub.rows === 1 ? '' : 's'} once when you save.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Split like {sub.parent}
              {parentAgencyIds.length
                ? ` (${agencies
                    .filter((a) => parentAgencyIds.includes(a.id))
                    .map((a) => a.name)
                    .join(', ')})`
                : ' (no split rules)'}
              . Turn on to pick its own.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Details</Label>
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
            {save.isPending ? 'Saving…' : 'Save these settings'}
          </Button>
          {saved && !save.isPending && <span className="text-xs text-emerald-700">Saved</span>}
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
        <DialogTitle>Edit {sub.name}</DialogTitle>
        <DialogDescription>
          A sub-name of {sub.parent} in {sub.category}. Its rows still count under {sub.parent}; here it gets its own
          name, group, split rules and details, like any name.
        </DialogDescription>
      </DialogHeader>
      {body}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}
