import { describe, expect, it } from 'vitest'
import { canRenameAccount, combinedAccountName } from './account-names'

describe('combinedAccountName', () => {
  it('joins the last 4 of the same bank', () => {
    expect(combinedAccountName('TD 4562', 'TD 5845')).toBe('TD 4562 & 5845')
    expect(combinedAccountName('TD Canada Trust 4562', 'td canada trust 5845')).toBe('TD Canada Trust 4562 & 5845')
  })

  it('names both banks when they differ', () => {
    expect(combinedAccountName('TD 4562', 'BMO 5352')).toBe('TD 4562 & BMO 5352')
  })

  it('keeps only the last 4 digits and drops a mask', () => {
    expect(combinedAccountName('Chase 0012344362', 'Chase ••4148')).toBe('Chase 4362 & 4148')
  })

  it('adds to a name that was merged before, without repeating', () => {
    expect(combinedAccountName('TD 4562 & 5845', 'TD 1111')).toBe('TD 4562 & 5845 & 1111')
    expect(combinedAccountName('TD 4562 & BMO 5352', 'TD 4562')).toBe('TD 4562 & BMO 5352')
  })

  it('keeps the target when a name has no account digits', () => {
    expect(combinedAccountName('Petty cash', 'TD 4562')).toBe('Petty cash')
    expect(combinedAccountName('TD 4562', 'Savings')).toBe('TD 4562')
  })
})

describe('canRenameAccount', () => {
  it('offers a rename on real accounts only', () => {
    expect(canRenameAccount({ name: 'TD 4562' })).toBe(true)
    expect(canRenameAccount({ name: 'Travel' })).toBe(true)
    expect(canRenameAccount({ name: 'Uncategorized' })).toBe(false)
    expect(canRenameAccount({ name: "Owner's Loan" })).toBe(false)
  })
})
