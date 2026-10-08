import { useState } from 'react'
import { Landmark, Pencil, Plus, Trash2 } from 'lucide-react'
import { AGENCY_TYPE_LABEL, type TaxAgency } from '@/api/bookkeeping'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useDeleteAgency } from '@/hooks/useDeleteAgency'
import { useSaveAgency } from '@/hooks/useSaveAgency'
import { useTax } from '@/hooks/useTax'
import { cn } from '@/lib/utils'
import { AgencyDialog } from './AgencyDialog'

const pct = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 3 })}%`

/** The Names tab: the customer's tax agencies, each switchable on and off. */
export function TaxAgencies() {
  const tax = useTax()
  const save = useSaveAgency()
  const remove = useDeleteAgency()
  const [editing, setEditing] = useState<TaxAgency | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirm, setConfirm] = useState<TaxAgency | null>(null)

  const agencies = tax.data?.agencies ?? []
  const open = (agency: TaxAgency | null) => {
    setEditing(agency)
    setDialogOpen(true)
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-[#0B1C2C]">Tax agencies</h2>
          <p className="text-sm text-muted-foreground">
            {tax.data && !tax.data.enabled
              ? 'Sales tax is off — switch it on in Overview to add these to your ledger.'
              : 'Active agencies are applied to your transactions when you click Generate.'}
          </p>
        </div>
        <Button onClick={() => open(null)} className="h-10 gap-2 rounded-lg bg-brand px-4 text-white hover:bg-brand/85">
          <Plus className="size-4" />
          Add agency
        </Button>
      </div>

      {tax.isLoading ? (
        <div className="flex flex-col gap-2 p-5">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : !agencies.length ? (
        <div className="px-6 py-14 text-center">
          <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Landmark className="size-5" />
          </span>
          <p className="font-medium text-[#0B1C2C]">No tax agencies yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add one — e.g. “Federal Tax”, sales, 10% — and its tax is posted under every taxable transaction.
          </p>
        </div>
      ) : (
        <ul className="divide-y">
          {agencies.map((a) => (
            <li key={a.id} className={cn('flex items-center gap-4 px-5 py-3.5', !a.active && 'opacity-60')}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Landmark className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[#0B1C2C]">{a.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary">{AGENCY_TYPE_LABEL[a.type]}</Badge>
                  <span className="text-sm text-muted-foreground tabular-nums">{pct(a.rate)}</span>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="hidden sm:inline">{a.active ? 'Active' : 'Off'}</span>
                <Switch
                  checked={a.active}
                  disabled={save.isPending}
                  onCheckedChange={(active) => save.mutate({ id: a.id, active })}
                  className="data-checked:bg-brand"
                  aria-label={`${a.name} active`}
                />
              </label>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon-sm" title="Edit" onClick={() => open(a)}>
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Delete"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirm(a)}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {(tax.error || save.error) && (
        <p className="px-5 pb-4 text-sm text-destructive">{(tax.error ?? save.error)?.message}</p>
      )}

      <AgencyDialog open={dialogOpen} onOpenChange={setDialogOpen} agency={editing} />

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {confirm?.name}?</DialogTitle>
            <DialogDescription>
              Its tax lines leave your ledger the next time you click Generate. To pause it instead, switch it off.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => confirm && remove.mutate(confirm.id, { onSuccess: () => setConfirm(null) })}
            >
              {remove.isPending ? 'Deleting…' : 'Delete agency'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
