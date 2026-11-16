import { useState } from 'react'
import type { NameGroup, NameType, SubName, TaxAgency } from '@/api/bookkeeping'
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
import { NameFieldsEditor } from './NameFieldsEditor'

/**
 * step9 part 3 (2026-11-15, user: "a subname should have all the settings like a regular name
 * has"): a sub-name's own name, group, tax agencies and profile. Its category is changed on
 * its line (every row of it moves); its files are in its own folder (the folder icon).
 */
export function SubNameDialog({
  sub,
  open,
  onOpenChange,
  groups,
  parentGroup,
  parentType,
  agencies,
  parentAgencyIds,
}: {
  sub: SubName
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: NameGroup[]
  parentGroup: string
  parentType: NameType
  agencies: TaxAgency[]
  parentAgencyIds: number[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {open && (
          <SubNameForm
            key={sub.id}
            sub={sub}
            groups={groups}
            parentGroup={parentGroup}
            parentType={parentType}
            agencies={agencies}
            parentAgencyIds={parentAgencyIds}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function SubNameForm({
  sub,
  groups,
  parentGroup,
  parentType,
  agencies,
  parentAgencyIds,
  onDone,
}: {
  sub: SubName
  groups: NameGroup[]
  parentGroup: string
  parentType: NameType
  agencies: TaxAgency[]
  parentAgencyIds: number[]
  onDone: () => void
}) {
  const save = useSetSubNameSettings()
  const fields = useSetSubNameSettings()
  const [name, setName] = useState(sub.name)
  const [group, setGroup] = useState<string | null>(sub.group)
  const [own, setOwn] = useState(sub.ownAgencies)
  const [picked, setPicked] = useState(sub.ownAgencies ? sub.agencyIds : parentAgencyIds)
  const labelOf = (key: string) => groups.find((g) => g.key === key)?.label ?? key

  const submit = () =>
    save.mutate(
      {
        id: sub.id,
        ...(name.trim() !== sub.name && { name: name.trim() }),
        ...(group !== sub.group && { group }),
        agencyIds: own ? picked : null,
      },
      { onSuccess: onDone },
    )

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
          name, group, taxes and details, like any name.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sub-name">Name</Label>
        <Input id="sub-name" value={name} maxLength={191} onChange={(e) => setName(e.target.value)} />
        {sub.renamed && (
          <button
            type="button"
            onClick={() => setName('')}
            className="self-start text-xs font-medium text-brand hover:underline"
          >
            Use “{sub.parent} - {sub.category}” again
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Group</Label>
        <GroupPicker groups={groups} value={group ?? parentGroup} onChange={setGroup} />
        <p className="text-xs text-muted-foreground">
          {group === null ? `Same as ${sub.parent} (${labelOf(parentGroup)}).` : (
            <button type="button" onClick={() => setGroup(null)} className="font-medium text-brand hover:underline">
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
                if (!v) setPicked(parentAgencyIds)
              }}
              className="data-checked:bg-brand"
            />
            Its own taxes
          </Label>
          {own ? (
            <AgencyPicker
              name={name || sub.name}
              type={parentType}
              agencies={agencies}
              picked={picked}
              pending={false}
              onChange={setPicked}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Taxed like {sub.parent}
              {parentAgencyIds.length
                ? ` (${agencies
                    .filter((a) => parentAgencyIds.includes(a.id))
                    .map((a) => a.name)
                    .join(', ')})`
                : ' (no tax)'}
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

      {save.error && <p className="text-sm text-red-600">{save.error.message}</p>}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}
