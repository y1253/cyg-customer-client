import { describe, expect, it } from 'vitest'
import { answerProblem, rulesText, typedValue } from './custom-columns'

const rules = (type: 'TEXT' | 'LETTERS' | 'NUMBER', minChars: number | null = null, maxChars: number | null = null) => ({
  type,
  minChars,
  maxChars,
})

describe('answerProblem (same rules as the server)', () => {
  it('empty clears', () => expect(answerProblem(rules('NUMBER', 3), ' ')).toBeNull())
  it('number only', () => {
    expect(answerProblem(rules('NUMBER'), '-12.50')).toBeNull()
    expect(answerProblem(rules('NUMBER'), '-')).toBe('Numbers only')
  })
  it('text only', () => expect(answerProblem(rules('LETTERS'), 'Job 2')).toBe('Text only — no digits'))
  it('min / max', () => {
    expect(answerProblem(rules('TEXT', 3, 5), 'ab')).toBe('At least 3 characters')
    expect(answerProblem(rules('TEXT', 1, 5), 'abcdef')).toBe('At most 5 characters')
  })
})

describe('typedValue', () => {
  it('a number cell never takes letters', () => expect(typedValue(rules('NUMBER'), '12a3')).toBe('123'))
  it('a text-only cell never takes digits', () => expect(typedValue(rules('LETTERS'), 'Job 2')).toBe('Job '))
  it('stops at the max', () => expect(typedValue(rules('TEXT', null, 3), 'abcd')).toBe('abc'))
})

describe('rulesText', () => {
  it('says the type and the length', () => {
    expect(rulesText(rules('TEXT', 2, 10))).toBe('Any text · 2–10 characters')
    expect(rulesText({ type: 'DROPDOWN', minChars: null, maxChars: null })).toBe('Dropdown list')
  })
})
