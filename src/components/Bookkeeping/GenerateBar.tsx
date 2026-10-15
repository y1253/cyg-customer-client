import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { money } from '@/api/billing'
import type { Statement } from '@/api/bookkeeping'
import { PayDialog } from '@/components/Billing/PayDialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBillingConfig } from '@/hooks/useBillingConfig'
import { useCurrency, useUpdateCurrency } from '@/hooks/useCurrency'
import { useGenerate } from '@/hooks/useGenerate'

/**
 * Generate + the home currency. Uploading only stores a statement; Generate reads every
 * statement not read yet. When the admin has set a price, a Generate that reads new
 * statements opens the payment dialog first; a $0 price never asks for a card.
 * Tax is set per name on the Names tab (there is no switch any more). A statement in
 * another currency is converted to the home one at each day's Bank of Canada rate.
 */
export function GenerateBar({ statements }: { statements: Statement[] }) {
  const generate = useGenerate()
  const billing = useBillingConfig()
  const currency = useCurrency()
  const setCurrency = useUpdateCurrency()
  const [paying, setPaying] = useState(false)

  const waiting = statements.filter((s) => s.status === 'UPLOADED').length
  const reading = statements.some((s) => s.status === 'PENDING' || s.status === 'PROCESSING')
  const busy = generate.isPending || reading
  const priceCents = billing.data?.priceCents ?? 0
  const priceCurrency = billing.data?.currency ?? 'cad'
  const mustPay = waiting > 0 && priceCents > 0
  // Wait for the price before letting a Generate with new statements through.
  const canGenerate = !busy && waiting > 0 && !billing.isLoading

  const label = reading
    ? 'Reading statements…'
    : waiting
      ? `Generate · ${waiting} new${mustPay ? ` · ${money(priceCents, priceCurrency)}` : ''}`
      : 'Generate'

  return (
    <div className="mb-6 rounded-2xl bg-white ring-1 ring-black/5">
      <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#0B1C2C]">
            {waiting
              ? `${waiting} statement${waiting === 1 ? '' : 's'} ready to read`
              : 'Your ledger is up to date'}
          </p>
          <p className="text-sm text-muted-foreground">
            {waiting
              ? 'Upload everything first, then click Generate — we read them and post every transaction.'
              : 'Upload more statements any time, then click Generate.'}
          </p>
        </div>
        <label
          className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-1.5 text-sm font-medium text-[#0B1C2C]"
          title="The currency your books are kept in. Statements in another currency are converted at each day's Bank of Canada rate."
        >
          Home currency
          <Select
            value={currency.data?.home ?? null}
            onValueChange={(v) => v && v !== currency.data?.home && setCurrency.mutate(v)}
            disabled={!currency.data || setCurrency.isPending}
          >
            <SelectTrigger size="sm" className="w-20 bg-white">
              <SelectValue placeholder="…">{(v: string | null) => v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(currency.data?.currencies ?? []).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <Button
          disabled={!canGenerate}
          onClick={() =>
            mustPay
              ? setPaying(true)
              : // A 402 means the price changed since the page loaded: fetch it again.
                generate.mutate(undefined, { onError: () => void billing.refetch() })
          }
          className="h-10 gap-2 rounded-lg bg-brand px-5 text-white hover:bg-brand/85"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {label}
        </Button>
      </div>
      {(generate.error || setCurrency.error) && (
        <p role="alert" className="border-t px-5 py-2.5 text-sm text-destructive">
          {(generate.error ?? setCurrency.error)?.message}
        </p>
      )}

      <PayDialog open={paying} onOpenChange={setPaying} statements={waiting} />
    </div>
  )
}
