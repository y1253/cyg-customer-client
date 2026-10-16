import { CheckCircle2, Circle, Eye, EyeOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Read + completed, as TAGS only. The customer sees what our team has done with a
 * message but cannot change it — there is deliberately no click handler here.
 */
export function StatusBadges({
  isRead,
  isCompleted,
  className,
}: {
  isRead: boolean
  isCompleted: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      <Badge
        variant="outline"
        className={cn(
          'gap-1 font-normal',
          isRead
            ? 'border-slate-200 bg-slate-50 text-slate-600'
            : 'border-sky-200 bg-sky-50 text-sky-700',
        )}
      >
        {isRead ? <Eye /> : <EyeOff />}
        {isRead ? 'Read' : 'Unread'}
      </Badge>
      <Badge
        variant="outline"
        className={cn(
          'gap-1 font-normal',
          isCompleted
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-amber-200 bg-amber-50 text-amber-700',
        )}
      >
        {isCompleted ? <CheckCircle2 /> : <Circle />}
        {isCompleted ? 'Completed' : 'Open'}
      </Badge>
    </div>
  )
}
