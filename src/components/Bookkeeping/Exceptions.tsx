import { Trans, useTranslation } from 'react-i18next'
import type { NameDescription, NameExceptionOf } from '@/api/bookkeeping'
import { currentLocale } from '@/i18n'
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
  const { t } = useTranslation(['names', 'common'])
  return (
    <ul className={cn('mt-0.5 mb-1 ml-4 flex flex-col gap-0.5 border-l-2 border-amber-300 pl-3 text-xs', className)}>
      {exceptions.map((e) => (
        <li key={`${e.name}|${e.category ?? ''}|${e.split ? 's' : ''}`} className="flex flex-wrap items-center gap-x-2">
          {e.category ? (
            <span className="text-muted-foreground">
              <Trans
                t={t}
                i18nKey="exceptions.onlyRows"
                count={e.rows}
                values={{ category: e.category }}
                components={{ b: <span className="font-medium text-amber-800" /> }}
              />
            </span>
          ) : (
            <>
              <span className="text-muted-foreground">{e.split ? t('exceptions.splitNamed') : t('exceptions.renamedTo')}</span>
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
            · {t('rows', { count: e.rows, n: e.rows.toLocaleString(currentLocale()) })}
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
  const { t } = useTranslation(['names', 'common'])
  return (
    <>
      {items.map((x) => (
        <p key={`${x.main}|${x.key}`} className={cn('mt-0.5 text-xs text-amber-800', className)}>
          <Trans
            t={t}
            i18nKey={x.split ? 'exceptions.splitFrom' : 'exceptions.exceptionFrom'}
            count={x.rows}
            values={{ main: x.main }}
            components={{
              main: onGoTo ? (
                <button type="button" onClick={() => onGoTo(x.main)} className="font-medium underline hover:text-amber-950" />
              ) : (
                <span className="font-medium" />
              ),
            }}
          />{' '}
          <DescriptionLink description={x.description} onOpen={onOpenDescription} className="text-amber-800/70">
            {t('exceptions.quoted', { description: x.description })}
          </DescriptionLink>
        </p>
      ))}
    </>
  )
}
