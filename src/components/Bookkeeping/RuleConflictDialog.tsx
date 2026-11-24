import { Trans, useTranslation } from 'react-i18next'
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
import { useClosingValue } from '@/hooks/useClosingValue'
import type { RuleConflictState } from '@/hooks/useRuleConflict'

/**
 * step2: "this description is already linked to another name — move it?" Shown when a
 * name rule save answers RULE_CONFLICT; "Move it" saves again with `replace: true`, which
 * takes the description away from the name it had. A one-time change ("Only this row") never
 * asks, so it is the way to rename one transaction without moving the link.
 */
export function RuleConflictDialog({ conflict }: { conflict: RuleConflictState }) {
  const { t } = useTranslation(['ledger', 'common'])
  const shown = useClosingValue(conflict.pending)
  const names = shown ? [...new Set(shown.links.map((l) => l.name))] : []
  const from = names.join(', ')
  return (
    <Dialog open={!!conflict.pending} onOpenChange={(open) => !open && conflict.close()}>
      <DialogContent>
        {shown && (
          <>
            <DialogHeader>
              <DialogTitle>
                {names.length > 1 ? t('conflict.titleMany') : t('conflict.titleOne', { name: from })}
              </DialogTitle>
              <DialogDescription>
                <Trans
                  t={t}
                  i18nKey="conflict.question"
                  values={{ from, name: shown.name }}
                  components={{ strong: <strong /> }}
                />
              </DialogDescription>
            </DialogHeader>
            <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto text-sm">
              {shown.links.map((l) => (
                <li key={`${l.matchType}:${l.text}`} className="rounded-md bg-muted px-3 py-2">
                  <Trans
                    t={t}
                    i18nKey={l.matchType === 'CONTAINS' ? 'conflict.linkContains' : 'conflict.linkExact'}
                    values={{ text: l.text, name: l.name }}
                    components={{ b: <span className="font-medium" /> }}
                  />
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {t('conflict.help', { from, name: shown.name })}
            </p>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>{t('common:actions.cancel')}</DialogClose>
              <Button
                type="button"
                className="bg-brand text-white hover:bg-brand/85"
                onClick={() => {
                  conflict.close()
                  shown.retry()
                }}
              >
                {names.length > 1 ? t('conflict.takeAwayMany') : t('conflict.takeAwayOne', { name: from })}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
