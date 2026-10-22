import type { ReactNode } from 'react'
import { ChevronDown, Loader2, MoreHorizontal, Send, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { fmtWhen } from './schedule-format'

type Props = {
  icon: ReactNode
  title: string
  badge: { label: string; tone: 'muted' | 'brand' }
  /** "Every day at 6:00 AM". */
  when: string
  /** "by text to (514) 555-1234". */
  delivery: string
  on: boolean
  nextRunAt: string | null
  busy: boolean
  canSend: boolean
  sending: boolean
  open: boolean
  onToggleOpen: () => void
  onSwitch: (on: boolean) => void
  onSendNow: () => void
  onDelete?: () => void
  /** The expanded editor + history. */
  children: ReactNode
}

/**
 * step12: one schedule as a row of the Schedules list — what, when, how, next send and an
 * on/off switch at a glance; click to open its settings and recent sends below it.
 */
export function ScheduleRow(p: Props) {
  return (
    <li className={cn('transition-colors', p.open && 'bg-muted/30')}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={p.open}
        onClick={p.onToggleOpen}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            p.onToggleOpen()
          }
        }}
        className="flex cursor-pointer items-center gap-3 px-4 py-3.5 outline-none hover:bg-muted/40 focus-visible:bg-muted/40 sm:px-5"
      >
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-xl',
            p.on ? 'bg-brand/10 text-brand' : 'bg-muted text-muted-foreground',
          )}
        >
          {p.icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-medium text-[#0B1C2C]">{p.title}</p>
            <Badge
              variant={p.badge.tone === 'brand' ? 'secondary' : 'outline'}
              className={cn(
                'shrink-0 text-[10px]',
                p.badge.tone === 'brand' && 'bg-brand/10 text-brand',
              )}
            >
              {p.badge.label}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {p.when} · {p.delivery}
          </p>
          {/* phone: the next send under the line */}
          <p className="text-xs text-muted-foreground md:hidden">
            {p.on && p.nextRunAt ? `Next: ${fmtWhen(p.nextRunAt)}` : 'Off'}
          </p>
        </div>

        <div className="hidden w-40 shrink-0 text-right md:block">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">Next send</p>
          <p className="text-xs font-medium text-[#0B1C2C]">
            {p.on && p.nextRunAt ? fmtWhen(p.nextRunAt) : <span className="text-muted-foreground">Off</span>}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={p.on}
            disabled={p.busy}
            aria-label={p.on ? `Turn off ${p.title}` : `Turn on ${p.title}`}
            onCheckedChange={p.onSwitch}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`More for ${p.title}`}
              className="ml-1 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {p.sending ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem disabled={!p.canSend || p.busy} onClick={p.onSendNow}>
                <Send /> Send now
              </DropdownMenuItem>
              {p.onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" disabled={p.busy} onClick={p.onDelete}>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', p.open && 'rotate-180')}
        />
      </div>

      {p.open && <div className="border-t px-4 py-4 sm:px-5 sm:pl-[4.25rem]">{p.children}</div>}
    </li>
  )
}
