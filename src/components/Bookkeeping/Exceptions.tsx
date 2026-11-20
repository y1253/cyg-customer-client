import type { NameDescription, NameExceptionOf } from '@/api/bookkeeping'
import { cn } from '@/lib/utils'
import { DescriptionLink } from './DescriptionsLine'

/**
 * The rows of ONE description that left its name / sub-name one time — renamed (a link to
 * where they are now), only their category changed, or a split named apart from its
 * transaction. step12 (2026-11-20): shared by names, sub-names and the name window.
 */
export function ExceptionList({
  exceptions,
  onGoTo,
  className,
}: {
  exceptions: NonNullable<NameDescription['exceptions']>
  onGoTo?: (name: string) => void
  className?: string
}) {
  return (
    <ul className={cn('mt-0.5 mb-1 ml-4 flex flex-col gap-0.5 border-l-2 border-amber-300 pl-3 text-xs', className)}>
      {exceptions.map((e) => (
        <li key={`${e.name}|${e.category ?? ''}|${e.split ? 's' : ''}`} className="flex flex-wrap items-center gap-x-2">
          {e.category ? (
            <span className="text-muted-foreground">
              Only {e.rows === 1 ? 'this row' : 'these rows'} in{' '}
              <span className="font-medium text-amber-800">{e.category}</span>
            </span>
          ) : (
            <>
              <span className="text-muted-foreground">{e.split ? 'A split named' : 'Renamed one time to'}</span>
              {onGoTo ? (
                <button
                  type="button"
                  onClick={() => onGoTo(e.name)}
                  className="font-medium text-amber-800 underline hover:text-amber-950"
                >
                  {e.name}
                </button>
              ) : (
                <span className="font-medium text-amber-800">{e.name}</span>
              )}
            </>
          )}
          <span className="text-muted-foreground/80 tabular-nums">
            · {e.rows} row{e.rows === 1 ? '' : 's'}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** "One row is an exception from Walmart (“POS WALMART…”)" — the rows of this name / sub-name that left another. */
export function ExceptionOfLines({
  items,
  onGoTo,
  onOpenDescription,
  className,
}: {
  items: readonly NameExceptionOf[]
  onGoTo?: (name: string) => void
  onOpenDescription?: (description: string) => void
  className?: string
}) {
  return (
    <>
      {items.map((x) => (
        <p key={`${x.main}|${x.key}`} className={cn('mt-0.5 text-xs text-amber-800', className)}>
          {x.rows === 1 ? 'One row is' : `${x.rows} rows are`}{' '}
          {x.split ? (x.rows === 1 ? 'a split' : 'splits') : 'an exception'} from{' '}
          {onGoTo ? (
            <button type="button" onClick={() => onGoTo(x.main)} className="font-medium underline hover:text-amber-950">
              {x.main}
            </button>
          ) : (
            <span className="font-medium">{x.main}</span>
          )}{' '}
          <DescriptionLink description={x.description} onOpen={onOpenDescription} className="text-amber-800/70">
            (“{x.description}”)
          </DescriptionLink>
        </p>
      ))}
    </>
  )
}
