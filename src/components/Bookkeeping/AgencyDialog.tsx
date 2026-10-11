import { useEffect, useState } from 'react'
import { TAX_KIND_LABEL, type TaxAgency, type TaxAgencyInput, type TaxKind } from '@/api/bookkeeping'
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
import { useSaveAgency } from '@/hooks/useSaveAgency'

const KINDS: TaxKind[] = ['SALES', 'PURCHASE']
const EMPTY: Record<TaxKind, { on: boolean; rate: string }> = {
  SALES: { on: true, rate: '' },
  PURCHASE: { on: false, rate: '' },
}

const rateOf = (agency: TaxAgency, kind: TaxKind) => {
  const r = agency.rates.find((x) => x.kind === kind)
  return { on: !!r, rate: r ? String(r.rate) : '' }
}

/**
 * Add or edit a tax agency: a Sales rate, a Purchase rate, or both (each its own %).
 * `agency` = edit it; null = a new one. `onSaved` runs after a successful save (the sales-tax switch uses it to turn itself on after the first agency).
 */
export function AgencyDialog({
  open,
  onOpenChange,
  agency,
  title,
  description,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  agency: TaxAgency | null
  title?: string
  description?: string
  onSaved?: (agency: TaxAgency) => void
}) {
  const save = useSaveAgency()
  const [name, setName] = useState('')
  /** Per kind: whether the agency charges it, and the rate as typed. */
  const [rates, setRates] = useState<Record<TaxKind, { on: boolean; rate: string }>>(EMPTY)
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // A fresh form every time it opens.
  useEffect(() => {
    if (!open) return
    setName(agency?.name ?? '')
    setRates(
      agency
        ? {
            SALES: rateOf(agency, 'SALES'),
            PURCHASE: rateOf(agency, 'PURCHASE'),
          }
        : EMPTY,
    )
    setActive(agency?.active ?? true)
    setError(null)
    save.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agency])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Give the agency a name.')
    const chosen = KINDS.filter((k) => rates[k].on)
    if (!chosen.length) return setError('Give the agency a Sales rate, a Purchase rate, or both.')
    for (const k of chosen) {
      const value = Number(rates[k].rate)
      if (rates[k].rate.trim() === '' || !Number.isFinite(value) || value < 0 || value > 100) {
        return setError(`The ${TAX_KIND_LABEL[k].toLowerCase()} rate is a percent between 0 and 100.`)
      }
    }
    setError(null)
    const values: TaxAgencyInput = {
      name: name.trim(),
      rates: chosen.map((kind) => ({ kind, rate: Math.round(Number(rates[kind].rate) * 1000) / 1000 })),
      active,
    }
    save.mutate(
      { ...values, id: agency?.id },
      {
        onSuccess: (saved) => {
          onSaved?.(saved)
          onOpenChange(false)
        },
      },
    )
  }

  const message = error ?? save.error?.message

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>{title ?? (agency ? 'Edit tax agency' : 'Add a tax agency')}</DialogTitle>
            <DialogDescription>
              {description ??
                'The agency is the account its tax is posted to. Sales tax is credited to it; tax paid on purchases is debited.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="agency-name">Name</Label>
              <Input
                id="agency-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Federal Tax"
                maxLength={191}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Rates</Label>
                {rates.SALES.on && rates.PURCHASE.on && rates.SALES.rate !== rates.PURCHASE.rate && (
                  <button
                    type="button"
                    onClick={() => setRates((r) => ({ ...r, PURCHASE: { ...r.PURCHASE, rate: r.SALES.rate } }))}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    Same rate for both
                  </button>
                )}
              </div>
              {KINDS.map((kind) => (
                <div key={kind} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
                  <Switch
                    checked={rates[kind].on}
                    onCheckedChange={(on) => setRates((r) => ({ ...r, [kind]: { ...r[kind], on } }))}
                    className="data-checked:bg-brand"
                    aria-label={`${TAX_KIND_LABEL[kind]} tax`}
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{TAX_KIND_LABEL[kind]} tax</span>
                    <span className="block text-xs text-muted-foreground">
                      {kind === 'SALES' ? 'Charged on money you receive for a sale.' : 'Paid on money you spend on a purchase.'}
                    </span>
                  </span>
                  <div className="relative w-24">
                    <Input
                      inputMode="decimal"
                      value={rates[kind].rate}
                      disabled={!rates[kind].on}
                      onChange={(e) => setRates((r) => ({ ...r, [kind]: { ...r[kind], rate: e.target.value } }))}
                      placeholder="10"
                      className="bg-white pr-7"
                      aria-label={`${TAX_KIND_LABEL[kind]} rate`}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
              <span>
                <span className="block text-sm font-medium">Active</span>
                <span className="block text-xs text-muted-foreground">Only active agencies are applied on Generate.</span>
              </span>
              <Switch checked={active} onCheckedChange={setActive} className="data-checked:bg-brand" />
            </label>
            {message && (
              <p role="alert" className="text-sm text-destructive">
                {message}
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={save.isPending} className="bg-brand text-white hover:bg-brand/85">
              {save.isPending ? 'Saving…' : agency ? 'Save' : 'Add agency'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
