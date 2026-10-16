import { describe, expect, it } from 'vitest'
import type { Statement } from '@/api/bookkeeping'
import { folderOf, groupByAccount } from './statement-folders'

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
