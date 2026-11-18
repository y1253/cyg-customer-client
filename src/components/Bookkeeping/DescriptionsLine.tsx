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
  contains = [],
  onOpen,
  onMore,
  className,
}: {
  descriptions: ReadonlyArray<{ key?: string; description: string }>
  /** step9 (2026-11-17): its "description contains" rule texts, shown first. */
  contains?: readonly string[]
  onOpen?: (description: string) => void
  /** "+N more" opens the full list. */
  onMore: () => void
  className?: string
}) {
  const many = contains.length + descriptions.length
  if (!many) return null
  const shownContains = contains.slice(0, 2)
  const shownDescriptions = descriptions.slice(0, 2 - shownContains.length)
  return (
    <p className={cn('mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <span className="shrink-0 text-muted-foreground/70">Descriptions:</span>
      <span
        className="min-w-0 truncate"
        title={[...contains.map((t) => `contains “${t}”`), ...descriptions.map((d) => d.description)].join('\n')}
      >
        {shownContains.map((t, i) => (
          <span key={`c:${t}`}>
            {i > 0 && ' · '}contains “{t}”
          </span>
        ))}
        {shownDescriptions.map((d, i) => (
          <span key={d.key ?? d.description}>
            {(i > 0 || shownContains.length > 0) && ' · '}
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

/**
 * step9 (2026-11-18, part 2): a wrapper name's folded line — its sub-names' descriptions in
 * one "Descriptions: A (Office) · B (Repairs) +N more", each with the sub-name it is under, so
 * it shows which sub-name has them without unfolding. "+N more" / a sub-name chip unfolds.
 */
export function SubDescriptionsLine({
  parent,
  entries,
  onOpen,
  onMore,
  className,
}: {
  parent: string
  entries: ReadonlyArray<{ sub: string; key?: string; description: string; contains?: boolean }>
  onOpen?: (description: string) => void
  onMore: () => void
  className?: string
}) {
  if (!entries.length) return null
  const shown = entries.slice(0, 3)
  const prefix = `${parent} - `
  const short = (sub: string) => (sub.toLowerCase().startsWith(prefix.toLowerCase()) ? sub.slice(prefix.length) : sub)
  return (
    <p className={cn('mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <span className="shrink-0 text-muted-foreground/70">Descriptions:</span>
      <span
        className="min-w-0 truncate"
        title={entries.map((e) => `${e.contains ? `contains “${e.description}”` : e.description} → ${e.sub}`).join('\n')}
      >
        {shown.map((e, i) => (
          <span key={`${e.sub}:${e.contains ? 'c' : 'd'}:${e.key ?? e.description}`}>
            {i > 0 && ' · '}
            {e.contains ? (
              <>contains “{e.description}”</>
            ) : (
              <DescriptionLink description={e.description} onOpen={onOpen}>
                {e.description}
              </DescriptionLink>
            )}{' '}
            <button
              type="button"
              onClick={(ev) => {
                ev.stopPropagation()
                onMore()
              }}
              title={`Under ${e.sub} — show the sub-names`}
              className="rounded bg-brand/10 px-1 py-px text-[11px] font-medium text-brand hover:bg-brand/15"
            >
              {short(e.sub)}
            </button>
          </span>
        ))}
      </span>
      {entries.length > shown.length && (
        <button type="button" onClick={onMore} className="shrink-0 font-medium text-brand hover:underline">
          +{entries.length - shown.length} more
        </button>
      )}
    </p>
  )
}
