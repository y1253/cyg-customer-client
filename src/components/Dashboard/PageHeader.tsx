import type { ReactNode } from 'react'

/** Page title block used by every dashboard page. */
export function PageHeader({
  title,
  description,
  actions,
  above,
}: {
  title: string
  description?: string
  actions?: ReactNode
  /** Shown above the title (step12c: the Bookkeeping company switcher). */
  above?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {above && <div className="mb-3">{above}</div>}
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#0B1C2C] sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
