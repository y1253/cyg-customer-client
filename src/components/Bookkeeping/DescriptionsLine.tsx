import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * step2 (2026-11-15, `nd.png`): a description on the Names tab is a link — its ledger rows
 * under this name. Plain text where there is nowhere to open it.
 */
export function DescriptionLink({
  description,
  onOpen,
  className,
  children,
}: {
  description: string
  onOpen?: (description: string) => void
  className?: string
  children: ReactNode
}) {
  if (!onOpen) return <span className={className}>{children}</span>
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onOpen(description)
      }}
      title="See the transactions with this description"
      className={cn('max-w-full truncate text-left hover:text-brand hover:underline', className)}
    >
      {children}
    </button>
  )
}

/**
 * step9: the folded "Descriptions: A · B +N more" line under a name. step9 (2026-11-17, third
 * request): under a sub-name too — it shows its descriptions exactly like a name.
 */
export function DescriptionsLine({
  descriptions,
  onOpen,
  onMore,
  className,
}: {
  descriptions: ReadonlyArray<{ key?: string; description: string }>
  onOpen?: (description: string) => void
  /** "+N more" opens the full list. */
  onMore: () => void
  className?: string
}) {
  const many = descriptions.length
  if (!many) return null
  return (
    <p className={cn('mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <span className="shrink-0 text-muted-foreground/70">Descriptions:</span>
      <span className="min-w-0 truncate" title={descriptions.map((d) => d.description).join('\n')}>
        {descriptions.slice(0, 2).map((d, i) => (
          <span key={d.key ?? d.description}>
            {i > 0 && ' · '}
            <DescriptionLink description={d.description} onOpen={onOpen}>
              {d.description}
            </DescriptionLink>
          </span>
        ))}
      </span>
      {many > 2 && (
        <button type="button" onClick={onMore} className="shrink-0 font-medium text-brand hover:underline">
          +{many - 2} more
        </button>
      )}
    </p>
  )
}
