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
  const shown = useClosingValue(conflict.pending)
  const names = shown ? [...new Set(shown.links.map((l) => l.name))] : []
  const from = names.join(', ')
  return (
    <Dialog open={!!conflict.pending} onOpenChange={(open) => !open && conflict.close()}>
      <DialogContent>
        {shown && (
          <>
            <DialogHeader>
              <DialogTitle>Already linked to {names.length > 1 ? 'other names' : from}</DialogTitle>
              <DialogDescription>
                Take it away from {from} and link it to <strong>{shown.name}</strong>?
              </DialogDescription>
            </DialogHeader>
            <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto text-sm">
              {shown.links.map((l) => (
                <li key={`${l.matchType}:${l.text}`} className="rounded-md bg-muted px-3 py-2">
                  {l.matchType === 'CONTAINS' ? 'Every description containing ' : ''}
                  <span className="font-medium">“{l.text}”</span> is linked to{' '}
                  <span className="font-medium">{l.name}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              To rename only one transaction without moving the link, cancel and choose “Only this row”.
            </p>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button
                type="button"
                className="bg-brand text-white hover:bg-brand/85"
                onClick={() => {
                  conflict.close()
                  shown.retry()
                }}
              >
                Move it
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
