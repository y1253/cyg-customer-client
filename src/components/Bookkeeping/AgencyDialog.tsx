import { useEffect, useState } from 'react'
import { AGENCY_TYPE_LABEL, type TaxAgency, type TaxAgencyInput, type TaxAgencyType } from '@/api/bookkeeping'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useSaveAgency } from '@/hooks/useSaveAgency'

/**
 * Add or edit a tax agency. `agency` = edit it; null = a new one. `onSaved` runs after a
 * successful save (the sales-tax switch uses it to turn itself on after the first agency).
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
  const [type, setType] = useState<TaxAgencyType>('SALES')
  const [rate, setRate] = useState('')
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // A fresh form every time it opens.
  useEffect(() => {
    if (!open) return
    setName(agency?.name ?? '')
    setType(agency?.type ?? 'SALES')
    setRate(agency ? String(agency.rate) : '')
    setActive(agency?.active ?? true)
    setError(null)
    save.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agency])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(rate)
    if (!name.trim()) return setError('Give the agency a name.')
    if (rate.trim() === '' || !Number.isFinite(value) || value < 0 || value > 100) {
      return setError('The rate is a percent between 0 and 100.')
    }
    setError(null)
    const values: TaxAgencyInput = { name: name.trim(), type, rate: Math.round(value * 1000) / 1000, active }
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
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Applies to</Label>
                <Select
                  items={AGENCY_TYPE_LABEL}
                  value={type}
                  onValueChange={(v) => v && setType(v as TaxAgencyType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AGENCY_TYPE_LABEL).map(([v, label]) => (
                      <SelectItem key={v} value={v}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="agency-rate">Rate</Label>
                <div className="relative">
                  <Input
                    id="agency-rate"
                    inputMode="decimal"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="10"
                    className="pr-8"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
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
