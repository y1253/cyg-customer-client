import { cn } from '@/lib/utils'

/**
 * The site's one button shape (Webflow `.main-button`): 8px radius, 20x32 padding,
 * 16px semibold. Applied to plain <a> anchors — every CTA here is a link to a
 * section, a mailto or a tel, never an action.
 */
export function ctaClass(tone: 'light' | 'brand', className?: string) {
  return cn(
    'inline-flex items-center justify-center rounded-lg px-6 py-3.5 text-sm font-semibold leading-none transition-all duration-300 sm:px-8 sm:py-5 sm:text-base',
    'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/50',
    tone === 'light'
      ? 'bg-white text-black hover:bg-white/85'
      : 'bg-brand text-white hover:bg-brand/85',
    className,
  )
}

/** Uppercase eyebrow above every section heading (Webflow `.sub-header`). */
export const EYEBROW =
  'mb-6 inline-block text-xs uppercase tracking-[2px] opacity-50 sm:text-sm'

/** Section h2 (Webflow `h2`): 55px bold, teal, tight tracking. */
export const SECTION_TITLE =
  'text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-brand sm:text-[45px] lg:text-[55px]'
