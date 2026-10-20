import { describe, expect, it } from 'vitest'
import { startingNote } from './starting-dates'
import { fmtDay } from './period'

describe('startingNote', () => {
  it('says nothing for an account with no starting balance', () => {
    expect(startingNote([])).toBeNull()
  })

  it('shows one start without a warning', () => {
    expect(startingNote([{ date: '2023-12-29' }])).toEqual({
      text: `Starts ${fmtDay('2023-12-29')}`,
      warn: false,
    })
  })

  it('warns when the books restart, oldest date first', () => {
    const note = startingNote([{ date: '2024-10-31' }, { date: '2023-12-29' }])
    expect(note).toEqual({
      text: `Starts ${fmtDay('2023-12-29')} · restarts ${fmtDay('2024-10-31')}`,
      warn: true,
    })
  })

  it('counts an undated start too', () => {
    const note = startingNote([{ date: null }, { date: '2024-01-01' }])
    expect(note?.warn).toBe(true)
    expect(note?.text).toContain('an undated statement')
  })
})
