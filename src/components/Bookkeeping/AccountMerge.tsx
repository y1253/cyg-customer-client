import { useState } from 'react'
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
import { useMergeAccounts } from '@/hooks/useMerge'

/**
 * step8: merge one account into another — dropped on its row (`account-move.ts`
 * `useAccountDrop`), confirmed here first because dragging back cannot split them.
 * `ask(from, into, bank)` opens the confirm; render `dialog` once, show `error` under the report.
 */
export function useAccountMerge() {
  const merge = useMergeAccounts()
  const [pair, setPair] = useState<{ from: string; into: string; bank: boolean } | null>(null)
  const dialog = (
    <Dialog open={!!pair} onOpenChange={(o) => !o && setPair(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Merge {pair?.from} into {pair?.into}?
          </DialogTitle>
          <DialogDescription>
            Every transaction and rule of {pair?.from} moves to {pair?.into}
            {pair?.bank ? ', and their Bank feeds folders become one (statements and connected bank included)' : ''}.{' '}
            {pair?.into} keeps its own section and settings. Dragging back cannot split them again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            disabled={merge.isPending}
            onClick={() =>
              pair && merge.mutate({ from: pair.from, into: pair.into }, { onSettled: () => setPair(null) })
            }
          >
            {merge.isPending ? 'Merging…' : 'Merge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
  return {
    ask: (from: string, into: string, bank: boolean) => {
      merge.reset()
      setPair({ from, into, bank })
    },
    dialog,
    error: merge.error,
  }
}
