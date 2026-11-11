import { Folder, FolderOpen } from 'lucide-react'
import { BUCKET_LABEL, type BucketCounts, type BucketFilter } from '@/lib/name-files'
import { cn } from '@/lib/utils'

type Bucket = Exclude<BucketFilter, null>

const PILL: Record<Bucket, string> = {
  RELATED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 hover:bg-emerald-100',
  DOCUMENT: 'bg-slate-100 text-slate-700 ring-slate-500/20 hover:bg-slate-200',
  ERROR: 'bg-red-50 text-red-700 ring-red-600/25 hover:bg-red-100',
}

const FIELD: Record<Bucket, keyof BucketCounts> = { RELATED: 'related', DOCUMENT: 'document', ERROR: 'error' }

/**
 * step2 (2026-11-11): the three counts of a name's files (or of the whole book) — green =
 * linked to transactions, grey = not transactions, red = need attention. Each count opens
 * the list of just those files. A zero is hidden, except that nothing at all shows nothing.
 */
export function CountPills({
  counts,
  onPick,
  className,
  showZero = false,
}: {
  counts: BucketCounts
  onPick?: (bucket: Bucket) => void
  className?: string
  /** The paperclip card lists all three, zeros included. */
  showZero?: boolean
}) {
  const buckets = (['RELATED', 'DOCUMENT', 'ERROR'] as const).filter((b) => showZero || counts[FIELD[b]] > 0)
  if (!buckets.length) return null
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {buckets.map((b) => {
        const n = counts[FIELD[b]]
        const label = `${n} ${BUCKET_LABEL[b].toLowerCase()}`
        return onPick ? (
          <button
            key={b}
            type="button"
            title={`${label} — show them`}
            onClick={(e) => {
              e.stopPropagation()
              onPick(b)
            }}
            className={cn(
              'rounded-full px-1.5 text-[11px] leading-[18px] font-semibold tabular-nums ring-1 transition-colors',
              PILL[b],
            )}
          >
            {n}
          </button>
        ) : (
          <span
            key={b}
            title={label}
            className={cn('rounded-full px-1.5 text-[11px] leading-[18px] font-semibold tabular-nums ring-1', PILL[b])}
          >
            {n}
          </span>
        )
      })}
    </span>
  )
}

/** A name's folder icon with its counts: the icon opens the folder, a count opens that list. */
export function FolderButton({
  name,
  counts,
  onOpen,
}: {
  name: string
  counts: BucketCounts
  onOpen: (bucket: BucketFilter) => void
}) {
  const any = counts.related + counts.document + counts.error + counts.reading > 0
  const Icon = any ? FolderOpen : Folder
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => onOpen(null)}
        title={`Open the folder of ${name} — its files, or add some`}
        className={cn(
          'flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-brand/10 hover:text-brand',
          counts.error > 0 ? 'text-red-600' : any ? 'text-brand' : 'text-muted-foreground/60',
        )}
      >
        <Icon className="size-4" />
      </button>
      <CountPills counts={counts} onPick={onOpen} />
    </span>
  )
}
