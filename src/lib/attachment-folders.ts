import type { Attachment } from '@/api/attachments'
import type { Statement } from '@/api/bookkeeping'
import { folderOf } from '@/components/Bookkeeping/statement-folders'
import type { ColumnDef } from '@/lib/table-sort'

/**
 * The Attachments tab's folders (step8): one per bank / card account, holding that
 * account's statements AND the receipts, cheques and voice notes matched to its rows, plus
 * one "Not filed yet" folder for what has no account yet (a statement not read, an
 * attachment not matched).
 *
 * A statement's folder is the same as on the Statements tab (`folderOf`); an attachment's
 * is the account of the statement its transaction came from — computed by the server
 * (`Attachment.folder`, `attachment-folders.util.ts`). The staff app's company Attachments
 * folder groups the same way (internal `company-files.util.ts`). Pure, so it is tested.
 */
export const UNFILED = 'unfiled'

export type FileFolder = {
  /** The account name, or `UNFILED`. */
  key: string
  /** The account name; null = "Not filed yet". */
  name: string | null
  card: boolean
  statements: Statement[]
  attachments: Attachment[]
}

export type FileItem =
  | { type: 'statement'; key: string; statement: Statement }
  | { type: 'attachment'; key: string; attachment: Attachment }

/** Folders by account name A→Z, "Not filed yet" last; empty folders never appear. */
export function fileFolders(statements: Statement[], attachments: Attachment[]): FileFolder[] {
  const byKey = new Map<string, FileFolder>()
  const folder = (name: string | null): FileFolder => {
    const key = name ?? UNFILED
    let f = byKey.get(key)
    if (!f) {
      f = { key, name, card: false, statements: [], attachments: [] }
      byKey.set(key, f)
    }
    return f
  }
  for (const s of statements) {
    const f = folder(folderOf(s))
    f.statements.push(s)
    if (s.accountKind === 'CREDIT_CARD') f.card = true
  }
  for (const a of attachments) folder(a.folder).attachments.push(a)
  return [...byKey.values()].sort((a, b) => {
    if (a.name === null) return 1
    if (b.name === null) return -1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
}

/** A folder's statements and attachments as one list (the table sorts it). */
export function folderItems(f: FileFolder): FileItem[] {
  return [
    ...f.statements.map((statement): FileItem => ({ type: 'statement', key: `s:${statement.id}`, statement })),
    ...f.attachments.map((attachment): FileItem => ({ type: 'attachment', key: `a:${attachment.id}`, attachment })),
  ]
}

/** What a row is called: the vendor or payee the AI read, else the file's own name. */
export function itemName(i: FileItem): string {
  if (i.type === 'statement') return i.statement.label || i.statement.filename
  const a = i.attachment
  return a.reading?.vendor ?? a.reading?.payee ?? a.filename
}

/** The day a row is about: the statement's period end, the receipt's date, else the upload. */
export function itemDate(i: FileItem): string {
  if (i.type === 'statement') return i.statement.periodEnd ?? i.statement.createdAt.slice(0, 10)
  const a = i.attachment
  return a.reading?.date ?? a.transaction?.date ?? a.createdAt.slice(0, 10)
}

export const itemSize = (i: FileItem): number =>
  i.type === 'statement' ? i.statement.sizeBytes : i.attachment.size

/** The money on it: a receipt's total, else its transaction's amount; statements have none. */
export function itemAmount(i: FileItem): number | null {
  if (i.type === 'statement') return null
  const a = i.attachment
  return a.total ?? (a.transaction ? Math.abs(a.transaction.amount) : null)
}

export const itemType = (i: FileItem): string =>
  i.type === 'statement' ? 'Statement' : (KIND_NAMES[i.attachment.kind] ?? 'Other')

const KIND_NAMES: Record<Attachment['kind'], string> = {
  RECEIPT: 'Receipt',
  CHECK: 'Cheque',
  AUDIO: 'Voice note',
  TEXT: 'Text message',
  OTHER: 'Other',
}

/** The table's columns — each sorts and filters on its own (`ColumnHeader`). */
export const FILE_COLUMNS: ColumnDef<FileItem>[] = [
  { key: 'name', kind: 'text', value: (i) => [itemName(i), i.type === 'statement' ? i.statement.filename : i.attachment.filename] },
  { key: 'type', kind: 'text', value: itemType },
  { key: 'date', kind: 'date', value: itemDate },
  { key: 'size', kind: 'number', value: itemSize },
  { key: 'amount', kind: 'number', value: itemAmount },
]

/** "1.2 MB" */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
