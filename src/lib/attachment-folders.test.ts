import { describe, expect, it } from 'vitest'
import type { Attachment } from '@/api/attachments'
import type { Statement } from '@/api/bookkeeping'
import { applyTable } from './table-sort'
import {
  FILE_COLUMNS,
  fileFolders,
  fileFoldersByName,
  fileSize,
  folderItems,
  itemAmount,
  itemDate,
  itemName,
  UNCLARIFIED_FOLDER,
  UNFILED,
} from './attachment-folders'

const s = (id: number, extra: Partial<Statement>): Statement => ({
  id,
  filename: `${id}.pdf`,
  sizeBytes: 100,
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

const a = (id: number, extra: Partial<Attachment>): Attachment => ({
  id,
  kind: 'RECEIPT',
  status: 'MATCHED',
  filename: `r${id}.jpg`,
  mimeType: 'image/jpeg',
  size: 10,
  createdAt: '2026-10-02T00:00:00Z',
  reading: null,
  total: null,
  matchNote: null,
  error: null,
  source: 'UPLOAD',
  sourcePhone: null,
  message: null,
  folder: null,
  transaction: null,
  ...extra,
})

describe('fileFolders', () => {
  it("puts statements and their account's attachments together, unfiled last", () => {
    const folders = fileFolders(
      [
        s(1, { accountName: 'TD 5234' }),
        s(2, { status: 'PENDING' }),
        s(3, { accountName: 'BMO 2304', accountKind: 'CREDIT_CARD' }),
      ],
      [a(10, { folder: 'TD 5234' }), a(11, { status: 'UNMATCHED' }), a(12, { folder: 'Amex 1001' })],
    )
    expect(folders.map((f) => f.key)).toEqual(['Amex 1001', 'BMO 2304', 'TD 5234', UNFILED])
    expect(folders[1].card).toBe(true)
    const td = folders[2]
    expect(td.statements.map((x) => x.id)).toEqual([1])
    expect(td.attachments.map((x) => x.id)).toEqual([10])
    const unfiled = folders[3]
    expect(unfiled.name).toBeNull()
    expect(unfiled.statements.map((x) => x.id)).toEqual([2])
    expect(unfiled.attachments.map((x) => x.id)).toEqual([11])
  })

  it('makes no folder for nothing', () => {
    expect(fileFolders([], [])).toEqual([])
  })
})

describe('file rows', () => {
  it('names a receipt by its vendor and dates it by the receipt', () => {
    const r = a(1, { reading: { kind: 'RECEIPT', vendor: 'Walmart', date: '2026-09-04' } as Attachment['reading'], total: 12.5 })
    const [item] = folderItems({ key: 'x', name: 'x', card: false, statements: [], attachments: [r] })
    expect(itemName(item)).toBe('Walmart')
    expect(itemDate(item)).toBe('2026-09-04')
    expect(itemAmount(item)).toBe(12.5)
  })

  it('sorts a folder by name and by size', () => {
    const folder = fileFolders(
      [s(1, { accountName: 'TD', label: 'TD · Sep 2026', sizeBytes: 900 })],
      [a(2, { folder: 'TD', filename: 'bravo.jpg', size: 5 }), a(3, { folder: 'TD', filename: 'alpha.jpg', size: 50 })],
    )[0]
    const items = folderItems(folder)
    const byName = applyTable(items, FILE_COLUMNS, {}, { key: 'name', dir: 'asc' }).map(itemName)
    expect(byName).toEqual(['alpha.jpg', 'bravo.jpg', 'TD · Sep 2026'])
    const bySize = applyTable(items, FILE_COLUMNS, {}, { key: 'size', dir: 'desc' }).map((i) => i.key)
    expect(bySize).toEqual(['s:1', 'a:3', 'a:2'])
  })

  it('formats sizes', () => {
    expect(fileSize(500)).toBe('500 B')
    expect(fileSize(2048)).toBe('2 KB')
    expect(fileSize(3 * 1024 * 1024)).toBe('3.0 MB')
  })
})

describe('fileFoldersByName', () => {
  const tx = (name: string | null) =>
    ({ id: 1, name, description: 'POS', amount: -10, date: null, statementId: 1, statementLabel: '', splitCount: 0 }) as Attachment['transaction']
  const read = (vendor: string) => ({ vendor }) as Attachment['reading']

  it('puts every receipt of one payee in one folder, whatever the case', () => {
    const folders = fileFoldersByName(
      [
        a(1, { transaction: tx('Walmart') }),
        a(2, { reading: read('WALMART'), status: 'UNMATCHED' }),
        a(3, { transaction: tx('Walmart') }),
        a(4, { transaction: tx('Home Depot') }),
      ],
      'Unclarified name',
    )
    expect(folders.map((f) => [f.name, f.attachments.map((x) => x.id)])).toEqual([
      ['Home Depot', [4]],
      ['Walmart', [1, 2, 3]],
    ])
  })

  it("prefers the transaction's name (after renames) over what was read", () => {
    const [f] = fileFoldersByName([a(1, { transaction: tx('Costco'), reading: read('COSTCO WHOLESALE #12') })], 'U')
    expect(f.name).toBe('Costco')
  })

  it('files a nameless match under Unclarified and the unknown last', () => {
    const folders = fileFoldersByName([a(1, { transaction: null }), a(2, { transaction: tx(null) })], 'Unclarified name')
    expect(folders.map((f) => [f.key, f.name])).toEqual([
      [UNCLARIFIED_FOLDER, 'Unclarified name'],
      [UNFILED, null],
    ])
  })
})
