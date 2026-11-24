import i18n, { currentLocale } from '@/i18n'

/** YYYY-MM-DD → "Sep 2, 2026" / "2 sept. 2026", parsed as LOCAL midnight so it never slips a day. */
export const fmtDay = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString(currentLocale(), { month: 'short', day: 'numeric', year: 'numeric' })

/** "Sep 1, 2026 – Sep 30, 2026", "From …", "Up to …" or "All time". */
export function periodLabel(from: string | null, to: string | null): string {
  if (from && to) return `${fmtDay(from)} – ${fmtDay(to)}`
  if (from) return i18n.t('common:period.from', { date: fmtDay(from) })
  if (to) return i18n.t('common:period.upTo', { date: fmtDay(to) })
  return i18n.t('common:period.allTime')
}
