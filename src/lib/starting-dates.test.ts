import { describe, expect, it } from 'vitest'
import { startingNote, startReasonText } from './starting-dates'
import { fmtDay } from './period'

describe('startingNote', () => {
  it('says nothing for an account with no starting balance and no date', () => {
    expect(startingNote([])).toBeNull()
  })

  it('falls back to the first statement day when there is no starting balance row', () => {
    expect(startingNote([], '2024-01-01T00:00:00.000Z')).toEqual({
      text: `Starting date: ${fmtDay('2024-01-01')}`,
      warn: false,
    })
  })

  it('shows one start without a warning', () => {
    expect(startingNote([{ date: '2023-12-29' }], '2023-01-01')).toEqual({
      text: `Starting date: ${fmtDay('2023-12-29')}`,
      warn: false,
    })
  })

  it('warns when the books restart, oldest date first', () => {
    const note = startingNote([{ date: '2024-10-31' }, { date: '2023-12-29' }])
    expect(note).toEqual({
      text: `Starting dates: ${fmtDay('2023-12-29')} · ${fmtDay('2024-10-31')}`,
      warn: true,
    })
  })

  it('counts an undated start too', () => {
    const note = startingNote([{ date: null }, { date: '2024-01-01' }])
    expect(note?.warn).toBe(true)
    expect(note?.text).toContain('an undated statement')
  })

  it('says why each later start is there: a missing month', () => {
    const note = startingNote([
      { date: '2026-01-01' },
      { date: '2026-07-01', reason: { kind: 'MISSING', previousStatementId: 1, from: '2026-06-01', to: '2026-06-30' } },
    ])
    expect(note?.reasons).toEqual([`${fmtDay('2026-07-01')}: missing statement ${fmtDay('2026-06-01')} – ${fmtDay('2026-06-30')}`])
  })

  it('says why: the balances do not carry over, with both amounts', () => {
    const text = startReasonText('2025-03-01', {
      kind: 'MISMATCH',
      previousStatementId: 1,
      previousEnd: '2025-02-28',
      previousClosing: 100,
      opening: 905.16,
    })
    expect(text).toBe(
      `${fmtDay('2025-03-01')}: balances don't carry over — the statement ending ${fmtDay('2025-02-28')} closes at 100.00, this one opens at 905.16`,
    )
  })

  it('gives no reasons for a single start', () => {
    expect(startingNote([{ date: '2026-01-01' }])?.reasons).toBeUndefined()
  })
})
