import { describe, expect, it } from 'vitest'
import type { Statement } from '@/api/bookkeeping'
import { balanceLine, folderOf, groupByAccount, startsByFolder } from './statement-folders'

const s = (id: number, extra: Partial<Statement>): Statement => ({
  id,
  filename: `${id}.pdf`,
  sizeBytes: 1,
  status: 'DONE',
  error: null,
  accountName: null,
  bankName: null,
  label: '',
  periodStart: null,
  periodEnd: null,
  transactionCount: 0,
  createdAt: '2026-10-01T00:00:00Z',
  processedAt: null,
  ...extra,
})

describe('groupByAccount', () => {
  it('makes one folder per account, sorted, newest statement first, unsorted last', () => {
    const folders = groupByAccount([
      s(1, { accountName: 'TD 5234', periodStart: '2026-01-01', periodEnd: '2026-01-31' }),
      s(2, { status: 'FAILED' }),
      s(3, { accountName: 'BMO 2304', accountKind: 'CREDIT_CARD', periodEnd: '2026-02-28' }),
      s(4, { accountName: 'TD 5234', periodStart: '2026-02-01', periodEnd: '2026-02-28' }),
    ])
    expect(folders.map((f) => f.account)).toEqual(['BMO 2304', 'TD 5234', null])
    expect(folders[0].card).toBe(true)
    expect(folders[1].statements.map((x) => x.id)).toEqual([4, 1])
    expect([folders[1].from, folders[1].to]).toEqual(['2026-01-01', '2026-02-28'])
    expect(folders[2].statements.map((x) => x.id)).toEqual([2])
  })

  it('files a read statement with no account under the ledger default', () => {
    expect(folderOf(s(1, {}))).toBe('Bank account')
    expect(folderOf(s(1, { status: 'PENDING' }))).toBeNull()
  })
})

describe('startsByFolder', () => {
  it('collects every starting balance per account, filtered or not', () => {
    const starts = startsByFolder([
      s(1, { accountName: 'TD 5234', startingBalance: { date: '2023-12-29', amount: 3392.74 } }),
      s(2, { accountName: 'TD 5234', startingBalance: null }),
      s(3, { accountName: 'TD 5234', startingBalance: { date: '2024-10-31', amount: 3849.57 } }),
      s(4, { accountName: 'BMO 2304' }),
    ])
    expect(starts.get('TD 5234')).toEqual([
      { date: '2023-12-29', amount: 3392.74 },
      { date: '2024-10-31', amount: 3849.57 },
    ])
    expect(starts.has('BMO 2304')).toBe(false)
  })
})

describe('starting balances and balance lines (step2, 2026-11-12)', () => {
  it('a folder start carries its amount; a card shows the amount owed', () => {
    const starts = startsByFolder([
      s(1, { accountName: 'TD 5234', startingBalance: { date: '2024-01-01', amount: 1200 } }),
      s(2, { accountName: 'Chase 4148', accountKind: 'CREDIT_CARD', startingBalance: { date: '2025-01-01', amount: -500 } }),
    ])
    expect(starts.get('TD 5234')).toEqual([{ date: '2024-01-01', amount: 1200 }])
    expect(starts.get('Chase 4148')).toEqual([{ date: '2025-01-01', amount: 500 }])
  })

  it('a start whose opening was not read has a date and no amount', () => {
    const starts = startsByFolder([s(1, { accountName: 'Wise Eur', startingBalance: { date: '2025-05-04' } })])
    expect(starts.get('Wise Eur')).toEqual([{ date: '2025-05-04' }])
  })

  it('says where a read statement starts and ends', () => {
    expect(balanceLine(s(1, { openingBalance: 1200, endingBalance: 1450 }))).toBe('Starts 1,200.00 · ends 1,450.00')
    expect(balanceLine(s(1, { accountKind: 'CREDIT_CARD', openingBalance: 0, endingBalance: 1024.43 }))).toBe(
      'Starts owes 0.00 · ends owes 1,024.43',
    )
    expect(balanceLine(s(1, { openingBalance: null, closingBalance: 50 }))).toBe('Starts not read · ends 50.00')
    expect(balanceLine(s(1, { status: 'UPLOADED', openingBalance: 1 }))).toBeNull()
    expect(balanceLine(s(1, {}))).toBeNull()
  })
})
