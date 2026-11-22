import { describe, expect, it } from 'vitest'
import { byLabel, sortByLabel } from './sort'

describe('byLabel', () => {
  it('sorts A–Z ignoring case and accents, numbers in number order', () => {
    expect(['banana', 'Apple', 'éclair', 'Item 10', 'Item 2'].sort(byLabel)).toEqual([
      'Apple',
      'banana',
      'éclair',
      'Item 2',
      'Item 10',
    ])
  })

  it('sortByLabel leaves the list it was given alone', () => {
    const list = [{ n: 'b' }, { n: 'A' }]
    expect(sortByLabel(list, (x) => x.n).map((x) => x.n)).toEqual(['A', 'b'])
    expect(list[0].n).toBe('b')
  })
})
