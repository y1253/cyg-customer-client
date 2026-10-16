import type { ReactNode } from 'react'
import { Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusBadges } from './StatusBadges'

/** One inbox row: channel icon, who, what, when, and the read/completed tags. */
export function MessageRow({
  icon,
  iconClass,
  title,
  subtitle,
  snippet,
  when,
  isRead,
  isCompleted,
  hasAttachment,
  onClick,
}: {
  icon: ReactNode
  iconClass: string
  title: string
  subtitle?: string
  snippet?: string
  when: string
  isRead: boolean
  isCompleted: boolean
  hasAttachment?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-start gap-3 border-b px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none',
        !isRead && 'bg-sky-50/40',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full [&_svg]:h-4 [&_svg]:w-4',
          iconClass,
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className={cn('truncate text-sm', isRead ? 'font-medium' : 'font-semibold text-[#0B1C2C]')}>
            {title}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{when}</span>
        </span>
        {subtitle && (
          <span className="mt-0.5 flex items-center gap-1 truncate text-sm text-foreground/80">
            {hasAttachment && <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />}
            <span className="truncate">{subtitle}</span>
          </span>
        )}
        {snippet && <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{snippet}</span>}
        <StatusBadges isRead={isRead} isCompleted={isCompleted} className="mt-2" />
      </span>
    </button>
  )
}
