/**
 * step8 (2026-11-11): the rules of the customer's own ledger columns — a COPY of the server's
 * `custom-column.util.ts` (`answerProblem`), so a cell refuses a bad answer before it is sent
 * (user's request: "the frontend should enforce the min char or max char etc."). The server
 * checks again. Keep the two in step.
 */
import i18n from '@/i18n'

export const CUSTOM_COLUMN_TYPES = ['TEXT', 'LETTERS', 'NUMBER', 'DROPDOWN'] as const
export type CustomColumnType = (typeof CUSTOM_COLUMN_TYPES)[number]

export const MAX_ANSWER_CHARS = 1000

/** Each type's label, read in the shown language at the moment it is used. */
export const TYPE_LABELS: Record<CustomColumnType, string> = {
  get TEXT() {
    return i18n.t('ledger:rules.type.TEXT')
  },
  get LETTERS() {
    return i18n.t('ledger:rules.type.LETTERS')
  },
  get NUMBER() {
    return i18n.t('ledger:rules.type.NUMBER')
  },
  get DROPDOWN() {
    return i18n.t('ledger:rules.type.DROPDOWN')
  },
}

export interface CustomColumnRules {
  type: CustomColumnType
  minChars: number | null
  maxChars: number | null
}

/** Why a typed answer breaks the column's rules, or null when it is fine (empty = clear). */
export function answerProblem(rules: CustomColumnRules, raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  if (v.length > MAX_ANSWER_CHARS) return i18n.t('ledger:rules.atMost', { count: MAX_ANSWER_CHARS })
  if (rules.type === 'NUMBER' && !/^-?\d+(?:[.,]\d+)?$/.test(v)) return i18n.t('ledger:rules.numbersOnly')
  if (rules.type === 'LETTERS' && /\d/.test(v)) return i18n.t('ledger:rules.noDigits')
  if (rules.minChars !== null && v.length < rules.minChars) {
    return i18n.t('ledger:rules.atLeast', { count: rules.minChars })
  }
  if (rules.maxChars !== null && v.length > rules.maxChars) {
    return i18n.t('ledger:rules.atMost', { count: rules.maxChars })
  }
  return null
}

/**
 * What the input may hold WHILE typing: a NUMBER cell takes no letters, a LETTERS cell no
 * digits, nothing past the max — so most mistakes can't even be typed. The rest (too short,
 * a lone "-") is said under the cell by `answerProblem`.
 */
export function typedValue(rules: CustomColumnRules, next: string): string {
  let v = next
  if (rules.type === 'NUMBER') v = v.replace(/[^\d.,-]/g, '')
  if (rules.type === 'LETTERS') v = v.replace(/\d/g, '')
  const max = rules.maxChars ?? MAX_ANSWER_CHARS
  return v.length > max ? v.slice(0, max) : v
}

/** The rules in a few words, for the column header's tooltip and the editor. */
export function rulesText(rules: CustomColumnRules): string {
  const parts = [TYPE_LABELS[rules.type]]
  if (rules.type !== 'DROPDOWN') {
    if (rules.minChars !== null && rules.maxChars !== null) {
      parts.push(i18n.t('ledger:rules.range', { min: rules.minChars, max: rules.maxChars }))
    } else if (rules.minChars !== null) parts.push(i18n.t('ledger:rules.atLeastLower', { count: rules.minChars }))
    else if (rules.maxChars !== null) parts.push(i18n.t('ledger:rules.atMostLower', { count: rules.maxChars }))
  }
  return parts.join(' · ')
}

/**
 * step9 part 3 (2026-11-15): does an answer already entered fit a column's NEW rules — the
 * server's `storedAnswerFit`, so the editor shows the rows to fix before Save (the server
 * refuses the same). A dropdown answer fits while its option stays, or when its text is one of
 * the new options; one whose option was already gone (`liveBefore`) never blocks.
 */
export function storedAnswerProblem(
  col: CustomColumnRules & { options: Array<{ id?: number; label: string }> },
  a: { value: string | null; dropDownId: number | null },
  liveBefore: ReadonlySet<number>,
): string | null {
  const text = (a.value ?? '').trim()
  if (a.dropDownId !== null && !liveBefore.has(a.dropDownId)) return null
  if (col.type === 'DROPDOWN') {
    if (a.dropDownId !== null && col.options.some((o) => o.id === a.dropDownId)) return null
    if (!text) return null
    return col.options.some((o) => o.label.trim().toLowerCase() === text.toLowerCase())
      ? null
      : i18n.t('ledger:rules.notAnOption')
  }
  return answerProblem(col, text)
}
