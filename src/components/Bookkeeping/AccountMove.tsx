import type { ReactNode } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import type { AccountType } from '@/api/bookkeeping'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { ALL, SECTION_LABEL, SHEET, useDropTarget } from './account-move'

/**
 * A section (Assets, Liabilities…) that takes an account dropped on it: drag a row from
 * one section to another to move the account there (`onMove`). Highlighted while a row is
 * over it.
 */
export function DropSection({
  type,
  onMove,
  className,
  children,
}: {
  type: AccountType
  onMove?: (account: string, type: AccountType) => void
  className?: string
  children: ReactNode
}) {
  const drop = useDropTarget(type, onMove)
  return (
    <div
      className={cn(className, 'rounded-lg transition-colors', drop.over && 'bg-brand/5 ring-2 ring-brand/30')}
      {...drop.props}
    >
      {children}
    </div>
  )
}

/** "Move to…" — the same move as dragging, for touch screens and keyboards. */
export function MoveMenu({
  account,
  current,
  bank,
  moved,
  onMove,
}: {
  account: string
  current: AccountType
  bank: boolean
  /** The customer already moved it — offer to put it back. */
  moved?: boolean
  onMove: (account: string, type: AccountType | null) => void
}) {
  const targets = (bank ? SHEET : ALL).filter((t) => t !== current)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        title="Move to another section"
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/5 hover:text-foreground focus-visible:opacity-100 data-[popup-open]:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <ArrowRightLeft className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel>Move “{account}” to</DropdownMenuLabel>
        {targets.map((t) => (
          <DropdownMenuItem key={t} onClick={() => onMove(account, t)}>
            {SECTION_LABEL[t]}
          </DropdownMenuItem>
        ))}
        {moved && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onMove(account, null)}>Put back where it was</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
