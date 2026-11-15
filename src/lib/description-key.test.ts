import { describe, expect, it } from 'vitest'
import { descriptionKey } from './description-key'

describe('descriptionKey (copy of the server rule)', () => {
  it('drops digits, punctuation, accents and one-letter words', () => {
    expect(descriptionKey('POS 0923 WALMART #1234 TORONTO ON')).toBe('pos walmart toronto on')
    expect(descriptionKey('CHEQUE # 00103')).toBe('cheque')
    expect(descriptionKey('CHQ#00124-0141165128')).toBe('chq')
    expect(descriptionKey('Café à Montréal')).toBe('cafe montreal')
    expect(descriptionKey(null)).toBe('')
  })
})
