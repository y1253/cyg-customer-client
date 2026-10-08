import { useState } from 'react'
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react'
import type { Statement } from '@/api/bookkeeping'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useGenerate } from '@/hooks/useGenerate'
import { useTax } from '@/hooks/useTax'
import { useUpdateTax } from '@/hooks/useUpdateTax'
import { AgencyDialog } from './AgencyDialog'

/**
 * Generate + the sales-tax switch. Uploading only stores a statement; Generate reads every
 * statement not read yet and applies changed tax settings. Turning sales tax on with no
 * active agency asks for one first.
 */
export function GenerateBar({ statements }: { statements: Statement[] }) {
  const tax = useTax()
  const updateTax = useUpdateTax()
  const generate = useGenerate()
  const [askAgency, setAskAgency] = useState(false)

  const waiting = statements.filter((s) => s.status === 'UPLOADED').length
  const reading = statements.some((s) => s.status === 'PENDING' || s.status === 'PROCESSING')
  const settings = tax.data
  const enabled = settings?.enabled ?? false
  const stale = enabled && !!settings?.stale
  const running = !!settings?.running
  const busy = generate.isPending || reading || running
  const canGenerate = !busy && (waiting > 0 || stale)

  const toggle = (on: boolean) => {
    if (on && !settings?.agencies.some((a) => a.active)) {
      setAskAgency(true)
      return
    }
    updateTax.mutate(on)
  }

  const label = reading
    ? 'Reading statements…'
    : running
      ? 'Calculating tax…'
      : waiting
        ? `Generate · ${waiting} new`
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
        <label className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium text-[#0B1C2C]">
          <Switch
            checked={enabled}
            disabled={updateTax.isPending || tax.isLoading}
            onCheckedChange={toggle}
            className="data-checked:bg-brand"
          />
          Sales tax
        </label>
        <Button
          disabled={!canGenerate}
          onClick={() => generate.mutate()}
          className="h-10 gap-2 rounded-lg bg-brand px-5 text-white hover:bg-brand/85"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {label}
        </Button>
      </div>
      {stale && !running && (
        <p className="flex items-center gap-2 border-t bg-amber-50 px-5 py-2.5 text-sm text-amber-800">
          <AlertTriangle className="size-4 shrink-0" />
          Tax settings changed — click Generate to update the tax lines in your ledger.
        </p>
      )}
      {(generate.error || updateTax.error) && (
        <p role="alert" className="border-t px-5 py-2.5 text-sm text-destructive">
          {(generate.error ?? updateTax.error)?.message}
        </p>
      )}

      <AgencyDialog
        open={askAgency}
        onOpenChange={setAskAgency}
        agency={null}
        title="Which tax agency?"
        description="Sales tax needs at least one agency. Its tax is posted under every taxable transaction, credited to the agency."
        onSaved={() => updateTax.mutate(true)}
      />
    </div>
  )
}
