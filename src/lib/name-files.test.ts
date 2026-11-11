import { describe, expect, it } from 'vitest'
import type { Attachment, NameFolder } from '@/api/attachments'
import {
  countsByName,
  fileKey,
  filesIn,
  filesOfBucket,
  folderPath,
  nameKey,
  subfoldersIn,
  totalCounts,
  UNSORTED,
} from './name-files'

const a = (id: number, extra: Partial<Attachment>): Attachment =>
  ({
    id,
    kind: 'RECEIPT',
    status: 'MATCHED',
    filename: `f${id}.jpg`,
    mimeType: 'image/jpeg',
    size: 1,
    createdAt: '2026-11-01T10:00:00Z',
    reading: null,
    total: null,
    matchNote: null,
    error: null,
    source: 'UPLOAD',
    sourcePhone: null,
    message: null,
    folder: null,
    transaction: null,
    name: 'Walmart',
    bucket: 'RELATED',
    folderId: null,
    displayName: null,
    hasEmail: false,
    ...extra,
  }) as Attachment

describe('nameKey / fileKey', () => {
  it('folds case and spacing', () => {
    expect(nameKey('  Home  Depot ')).toBe('home depot')
  })
  it('no name = Unsorted', () => {
    expect(fileKey(a(1, { name: null }))).toBe(UNSORTED)
  })
})

describe('counts', () => {
  const files = [
    a(1, { name: 'Walmart', bucket: 'RELATED' }),
    a(2, { name: 'WALMART', bucket: 'ERROR' }),
    a(3, { name: 'CRA', bucket: 'DOCUMENT' }),
    a(4, { name: null, bucket: 'ERROR' }),
    a(5, { name: 'CRA', bucket: 'READING' }),
  ]
  it('per name, case-insensitive, Unsorted on its own', () => {
    const c = countsByName(files)
    expect(c.get('walmart')).toEqual({ related: 1, document: 0, error: 1, reading: 0 })
    expect(c.get('cra')).toEqual({ related: 0, document: 1, error: 0, reading: 1 })
    expect(c.get(UNSORTED)).toEqual({ related: 0, document: 0, error: 1, reading: 0 })
  })
  it('for the whole book', () => {
    expect(totalCounts(files)).toEqual({ related: 1, document: 1, error: 2, reading: 1 })
  })
})

describe('folders', () => {
  const files = [
    a(1, { createdAt: '2026-01-01T00:00:00Z' }),
    a(2, { createdAt: '2026-03-01T00:00:00Z' }),
    a(3, { folderId: 7 }),
    a(4, { bucket: 'ERROR', folderId: 7 }),
  ]
  it('one level at a time, newest first', () => {
    expect(filesIn(files, 'walmart', null).map((f) => f.id)).toEqual([2, 1])
    expect(filesIn(files, 'walmart', 7).map((f) => f.id)).toEqual([4, 3])
  })
  it('a filter keeps one bucket', () => {
    expect(filesIn(files, 'walmart', 7, 'ERROR').map((f) => f.id)).toEqual([4])
  })
  it('the list of one bucket ignores subfolders', () => {
    expect(filesOfBucket(files, 'walmart', 'ERROR').map((f) => f.id)).toEqual([4])
    expect(filesOfBucket(files, null, 'RELATED')).toHaveLength(3)
  })

  const folders: NameFolder[] = [
    { id: 7, nameKey: 'walmart', parentId: null, title: 'Receipts' },
    { id: 8, nameKey: 'walmart', parentId: 7, title: 'B 2026' },
    { id: 9, nameKey: 'walmart', parentId: 7, title: 'a 2025' },
    { id: 10, nameKey: 'cra', parentId: null, title: 'Letters' },
  ]
  it('subfolders of one name and level, A→Z', () => {
    expect(subfoldersIn(folders, 'walmart', 7).map((f) => f.id)).toEqual([9, 8])
    expect(subfoldersIn(folders, 'walmart', null).map((f) => f.id)).toEqual([7])
  })
  it('the breadcrumb path, and a loop never hangs', () => {
    expect(folderPath(folders, 8).map((f) => f.id)).toEqual([7, 8])
    expect(folderPath(folders, null)).toEqual([])
    const loop: NameFolder[] = [
      { id: 1, nameKey: 'x', parentId: 2, title: 'a' },
      { id: 2, nameKey: 'x', parentId: 1, title: 'b' },
    ]
    expect(folderPath(loop, 1)).toHaveLength(2)
  })
})
