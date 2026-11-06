import { useMemo, type ReactNode } from 'react'
import type { UnrecognizedName } from '@/api/bookkeeping'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table'
import { money } from '@/lib/money'
import { applyTable, useTableControls, type ColumnDef } from '@/lib/table-sort'
import { cn } from '@/lib/utils'
import { ColumnHeader } from './ColumnHeader'
import { descriptionDragProps } from './name-drag'

const COLUMNS: ColumnDef<UnrecognizedName>[] = [
  { key: 'description', kind: 'text', value: (u) => u.sampleDescription },
  { key: 'category', kind: 'text', value: (u) => u.category },
  { key: 'rows', kind: 'number', value: (u) => u.rows },
  { key: 'total', kind: 'number', value: (u) => u.total },
]

/**
 * step11: the "Unclarified name" descriptions as a table — every column sorts and filters on
 * its own (`ColumnHeader`), Description A→Z by default. Each row drags onto a name like
 * before; `actions` renders its Assign / Reset buttons.
 */
export function UnclarifiedTable({
  rows,
  highlighted,
  actions,
  className,
}: {
  rows: UnrecognizedName[]
  highlighted?: (u: UnrecognizedName) => boolean
  actions: (u: UnrecognizedName) => ReactNode
  className?: string
}) {
  const controls = useTableControls({ key: 'description', dir: 'asc' })
  const shown = useMemo(
    () => applyTable(rows, COLUMNS, controls.filters, controls.sort),
    [rows, controls.filters, controls.sort],
  )

  return (
    <Table className={cn('table-fixed', className)}>
      <TableHeader>
        <TableRow>
          <ColumnHeader column="description" label="Description" kind="text" controls={controls} />
          <ColumnHeader
            column="category"
            label="Category"
            kind="text"
            controls={controls}
            className="hidden w-40 sm:table-cell"
          />
          <ColumnHeader column="rows" label="Rows" kind="number" controls={controls} className="w-20" align="end" />
          <ColumnHeader column="total" label="Total" kind="number" controls={controls} className="w-28" align="end" />
          <TableHead className="w-28" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {shown.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
              No description matches these filters.
            </TableCell>
          </TableRow>
        ) : (
          shown.map((u) => (
            <TableRow
              key={u.key}
              {...descriptionDragProps(u.key, u.sampleDescription)}
              title="Drag onto a name to give these rows that name"
              className={cn('cursor-grab active:cursor-grabbing', highlighted?.(u) && 'bg-amber-100/70')}
            >
              <TableCell className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[#0B1C2C]" title={u.sampleDescription}>
                    {u.sampleDescription}
                  </span>
                  {u.rule && <Badge className="shrink-0 bg-brand/10 text-brand">Edited</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground sm:hidden">{u.category}</p>
              </TableCell>
              <TableCell className="hidden truncate text-sm text-muted-foreground sm:table-cell">
                {u.category}
                {u.otherCategories > 0 && ` +${u.otherCategories} more`}
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                {u.rows.toLocaleString()}
              </TableCell>
              <TableCell
                className={cn(
                  'text-right text-sm font-medium tabular-nums',
                  u.total < 0 ? 'text-red-600' : 'text-emerald-700',
                )}
              >
                {money(u.total)}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">{actions(u)}</div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
