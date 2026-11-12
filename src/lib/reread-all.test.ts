import { describe, expect, it } from 'vitest'
import { rereadableFile } from '@/api/attachments'
import { rereadable, type Statement } from '@/api/bookkeeping'

const st = (over: Partial<Statement>) => ({ status: 'DONE', source: 'UPLOAD', problem: null, ...over }) as Statement

describe('rereadable — "Re-read all" under Problems', () => {
  it('failed, set aside, or DONE with a fixable problem', () => {
    expect(rereadable(st({ status: 'FAILED' }))).toBe(true)
    expect(rereadable(st({ status: 'NEEDS_REVIEW' }))).toBe(true)
    expect(rereadable(st({ problem: { kind: 'NO_BALANCES', title: '', text: '' } }))).toBe(true)
  })

  it('never a bank-feed month, a missing-statement gap, or a fine one', () => {
    expect(rereadable(st({ source: 'PLAID', status: 'FAILED' }))).toBe(false)
    expect(rereadable(st({ problem: { kind: 'MISSING', title: '', text: '' } }))).toBe(false)
    expect(rereadable(st({}))).toBe(false)
  })
})

describe('rereadableFile — "Read all again"', () => {
  it('only files that failed or matched nothing', () => {
    expect(rereadableFile({ status: 'FAILED' })).toBe(true)
    expect(rereadableFile({ status: 'UNMATCHED' })).toBe(true)
    expect(rereadableFile({ status: 'MATCHED' })).toBe(false)
    expect(rereadableFile({ status: 'PENDING' })).toBe(false)
  })
})
