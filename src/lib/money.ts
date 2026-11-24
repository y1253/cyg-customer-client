import { currentLocale } from '@/i18n'

/** 1234.5 → "1,234.50" (French: "1 234,50") — no currency sign, statements can be in any currency. */
export const money = (n: number) =>
  n.toLocaleString(currentLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })
