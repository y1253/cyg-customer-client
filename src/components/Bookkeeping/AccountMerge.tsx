import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { useMergeAccounts } from '@/hooks/useMerge'
import { combinedAccountName } from '@/lib/account-names'

/**
 * step8: merge one account into another — dropped on its row (`account-move.ts`
 * `useAccountDrop`), confirmed here first because dragging back cannot split them.
 * `ask(from, into, bank)` opens the confirm; render `dialog` once, show `error` under the report.
 * step2 (2026-11-08): two Bank feeds folders get a name holding both ("TD 4562 & 5845", or
 * "TD 4562 & BMO 5352" for two banks — `combinedAccountName`), which the customer may change.
 */
export function useAccountMerge() {
  const { t } = useTranslation(['books', 'common'])
  const merge = useMergeAccounts()
  const [pair, setPair] = useState<{ from: string; into: string; bank: boolean } | null>(null)
  const [name, setName] = useState('')
  const finalName = name.trim() || pair?.into || ''
  const dialog = (
    <Dialog open={!!pair} onOpenChange={(o) => !o && setPair(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('merge.title', { from: pair?.from, into: pair?.into })}</DialogTitle>
          <DialogDescription>
            {t(pair?.bank ? 'merge.textBank' : 'merge.text', { from: pair?.from, into: pair?.into })}
          </DialogDescription>
        </DialogHeader>
        {pair?.bank && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="merged-account-name">{t('merge.name')}</Label>
            <Input
              id="merged-account-name"
              value={name}
              maxLength={191}
              onChange={(e) => setName(e.target.value)}
              placeholder={pair.into}
            />
          </div>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t('common:actions.cancel')}</DialogClose>
          <Button
            disabled={merge.isPending}
            onClick={() =>
              pair &&
              merge.mutate(
                { from: pair.from, into: pair.into, ...(finalName !== pair.into ? { name: finalName } : {}) },
                { onSettled: () => setPair(null) },
              )
            }
          >
            {merge.isPending ? t('merge.merging') : t('merge.merge')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
  return {
    ask: (from: string, into: string, bank: boolean) => {
      merge.reset()
      setName(bank ? combinedAccountName(into, from) : '')
      setPair({ from, into, bank })
    },
    dialog,
    error: merge.error,
  }
}
