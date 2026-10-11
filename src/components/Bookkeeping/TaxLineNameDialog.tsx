import { useState } from 'react'
import type { LedgerTransaction } from '@/api/bookkeeping'
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
import { Label } from '@/components/ui/label'
import { useRenameTaxLine } from '@/hooks/useSplits'
import { NamePicker } from './NamePicker'

/** Rename one tax line. Left empty, it shows its transaction's name again. */
export function TaxLineNameDialog({
  line,
  onOpenChange,
}: {
  line: LedgerTransaction | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!line} onOpenChange={onOpenChange}>
      <DialogContent>{line && <TaxLineNameForm key={line.key} line={line} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  )
}

function TaxLineNameForm({ line, onDone }: { line: LedgerTransaction; onDone: () => void }) {
  const rename = useRenameTaxLine()
  const [name, setName] = useState(line.name ?? '')
  const trimmed = name.trim()
  const changed = trimmed !== (line.name ?? '')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!changed || rename.isPending || line.taxAgencyId === undefined) return
        rename.mutate({ id: line.id, agencyId: line.taxAgencyId, name: trimmed || null }, { onSuccess: onDone })
      }}
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>Name this tax line</DialogTitle>
        <DialogDescription>
          {line.offsetAccount} on “{line.description}”. Leave it empty to use the transaction's name.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tax-line-name">Name</Label>
        <NamePicker id="tax-line-name" value={name} onChange={setName} placeholder="e.g. Revenu Québec" autoFocus />
      </div>
      {rename.error && <p className="text-sm text-destructive">{rename.error.message}</p>}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={!changed || rename.isPending} className="bg-brand text-white hover:bg-brand/85">
          {rename.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}
