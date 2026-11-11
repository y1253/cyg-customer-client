/**
 * step8 (2026-11-11): the rules of the customer's own ledger columns — a COPY of the server's
 * `custom-column.util.ts` (`answerProblem`), so a cell refuses a bad answer before it is sent
 * (user's request: "the frontend should enforce the min char or max char etc."). The server
 * checks again. Keep the two in step.
 */

export const CUSTOM_COLUMN_TYPES = ['TEXT', 'LETTERS', 'NUMBER', 'DROPDOWN'] as const
export type CustomColumnType = (typeof CUSTOM_COLUMN_TYPES)[number]

export const MAX_ANSWER_CHARS = 1000

export const TYPE_LABELS: Record<CustomColumnType, string> = {
  TEXT: 'Any text',
  LETTERS: 'Text only (no digits)',
  NUMBER: 'Number only',
  DROPDOWN: 'Dropdown list',
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
  if (v.length > MAX_ANSWER_CHARS) return `At most ${MAX_ANSWER_CHARS} characters`
  if (rules.type === 'NUMBER' && !/^-?\d+(?:[.,]\d+)?$/.test(v)) return 'Numbers only'
  if (rules.type === 'LETTERS' && /\d/.test(v)) return 'Text only — no digits'
  if (rules.minChars !== null && v.length < rules.minChars) {
    return `At least ${rules.minChars} character${rules.minChars === 1 ? '' : 's'}`
  }
  if (rules.maxChars !== null && v.length > rules.maxChars) {
    return `At most ${rules.maxChars} character${rules.maxChars === 1 ? '' : 's'}`
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
    if (rules.minChars !== null && rules.maxChars !== null) parts.push(`${rules.minChars}–${rules.maxChars} characters`)
    else if (rules.minChars !== null) parts.push(`at least ${rules.minChars} characters`)
    else if (rules.maxChars !== null) parts.push(`at most ${rules.maxChars} characters`)
  }
  return parts.join(' · ')
}
