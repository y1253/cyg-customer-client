import { describe, expect, it } from 'vitest'
import { FIXED_COLUMNS, moveColumn, orderColumns } from './useLedgerColumns'

describe('orderColumns', () => {
  it('nothing saved = the default order, custom columns last', () => {
    expect(orderColumns([], [...FIXED_COLUMNS, 'c4'])).toEqual([...FIXED_COLUMNS, 'c4'])
  })

  it('keeps the saved order, drops columns that are gone, adds new ones', () => {
    const saved = ['amount', 'date', 'c9', 'name', 'description', 'debit', 'credit', 'statement']
    expect(orderColumns(saved, [...FIXED_COLUMNS, 'c4'])).toEqual([
      'amount',
      'date',
      'name',
      'description',
      'debit',
      'credit',
      'statement',
      'c4',
    ])
  })

  it('a fixed column missing from the saved order returns at its default place', () => {
    expect(orderColumns(['date', 'name', 'amount', 'debit', 'credit', 'statement'], [...FIXED_COLUMNS])).toEqual([
      ...FIXED_COLUMNS,
    ])
  })
})

describe('moveColumn', () => {
  it('moves a column before another, or to the end', () => {
    expect(moveColumn(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b'])
    expect(moveColumn(['a', 'b', 'c'], 'a', null)).toEqual(['b', 'c', 'a'])
    expect(moveColumn(['a', 'b', 'c'], 'b', 'b')).toEqual(['a', 'b', 'c'])
  })
})
