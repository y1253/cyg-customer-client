import { ListTree } from 'lucide-react'
import type { SubName } from '@/api/bookkeeping'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SubNameLine } from './SubNameLine'

/**
 * step9 (2026-11-15, user's request: "under names, clicking Walmart should pop up all its
 * sub-names"): a name with sub-names opens this instead of going straight to its ledger — the
 * name itself (every row) and each sub-name ("Walmart - Maintenance", and since step9 the
 * split transaction's own "Walmart - Groceries"), each opening only its rows. A sub-name's
 * category can be changed or the sub-name removed here, as before.
 */
export function NameSubNamesDialog({
  open,
  onOpenChange,
  name,
  rows,
  subNames,
  onOpenName,
  onOpenSubName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  /** The name's row count (its sub-names' rows included). */
  rows: number
  subNames: SubName[]
  onOpenName?: () => void
  onOpenSubName?: (sub: SubName) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate text-[#0B1C2C]">{name}</DialogTitle>
          <DialogDescription>
            {subNames.length} sub-name{subNames.length === 1 ? '' : 's'} · their rows still count under {name}
          </DialogDescription>
        </DialogHeader>
        {onOpenName && (
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => {
              onOpenChange(false)
              onOpenName()
            }}
          >
            <ListTree />
            See all {rows.toLocaleString()} row{rows === 1 ? '' : 's'} of {name}
          </Button>
        )}
        <div className="max-h-[55vh] space-y-1.5 overflow-y-auto pr-1">
          {subNames.map((sub) => (
            <div key={sub.id} className="rounded-lg border px-3 py-2">
              <SubNameLine
                sub={sub}
                onOpen={
                  onOpenSubName &&
                  (() => {
                    onOpenChange(false)
                    onOpenSubName(sub)
                  })
                }
              />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
