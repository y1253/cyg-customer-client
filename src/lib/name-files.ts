import type { Attachment, FileBucket, NameFolder } from '@/api/attachments'
import type { Statement } from '@/api/bookkeeping'
import { groupByAccount } from '@/components/Bookkeeping/statement-folders'

/**
 * step2 (2026-11-11): files live in the Names tab. Every file belongs to ONE name — the
 * server decides which (`Attachment.name`, null = Unsorted) and which of the three counts it
 * is in (`Attachment.bucket`). This file only groups and counts what the server said, so the
 * name folders, the Names-tab badges and the paperclip button can never disagree. Pure.
 */

/** The key names are matched on — case and spacing never make two folders (server twin: `nameKeyOf`). */
export const nameKey = (name: string): string => name.replace(/\s+/g, ' ').trim().toLowerCase()

/** The Unsorted entry's key: files with no name yet. */
export const UNSORTED = ''

/** The key of the folder a file sits in. */
export const fileKey = (a: Attachment): string => (a.name ? nameKey(a.name) : UNSORTED)

export type BucketCounts = { related: number; document: number; error: number; reading: number }

export const EMPTY_COUNTS: BucketCounts = { related: 0, document: 0, error: 0, reading: 0 }

const FIELD: Record<FileBucket, keyof BucketCounts> = {
  RELATED: 'related',
  DOCUMENT: 'document',
  ERROR: 'error',
  READING: 'reading',
}

/** Counts per name key (`UNSORTED` included). A name absent from the map has no files. */
export function countsByName(files: Attachment[]): Map<string, BucketCounts> {
  const out = new Map<string, BucketCounts>()
  for (const a of files) {
    const k = fileKey(a)
    const c = out.get(k) ?? { ...EMPTY_COUNTS }
    c[FIELD[a.bucket]]++
    out.set(k, c)
  }
  return out
}

/** The whole book's counts — the paperclip button. */
export function totalCounts(files: Attachment[]): BucketCounts {
  const c = { ...EMPTY_COUNTS }
  for (const a of files) c[FIELD[a.bucket]]++
  return c
}

/** The three filter chips of a folder; null = every file. */
export type BucketFilter = 'RELATED' | 'DOCUMENT' | 'ERROR' | null

export const BUCKET_LABEL: Record<Exclude<BucketFilter, null>, string> = {
  RELATED: 'Linked to transactions',
  DOCUMENT: 'Not transactions',
  ERROR: 'Need attention',
}

/** A file's date on its folder: what the AI read, else its transaction's, else when it came. */
export function fileDate(a: Attachment): string {
  return a.reading?.date ?? a.transaction?.date ?? a.createdAt.slice(0, 10)
}

/** What a file is called on its folder: the customer's own name, else what was read, else its file name. */
export function fileTitle(a: Attachment): string {
  return a.displayName ?? a.reading?.summary ?? a.reading?.vendor ?? a.reading?.payee ?? a.filename
}

/** The files of one name's folder (one level: `folderId` null = its top), newest first. */
export function filesIn(
  files: Attachment[],
  key: string,
  folderId: number | null,
  filter: BucketFilter = null,
): Attachment[] {
  return files
    .filter((a) => fileKey(a) === key && (a.folderId ?? null) === folderId && (!filter || a.bucket === filter))
    .sort((x, y) => fileDate(y).localeCompare(fileDate(x)) || y.id - x.id)
}

/** Every file of a name in one bucket, whatever subfolder it sits in — the "list of errors". */
export function filesOfBucket(files: Attachment[], key: string | null, bucket: Exclude<BucketFilter, null>): Attachment[] {
  return files
    .filter((a) => a.bucket === bucket && (key === null || fileKey(a) === key))
    .sort((x, y) => fileDate(y).localeCompare(fileDate(x)) || y.id - x.id)
}

/** The subfolders directly inside `parentId` (null = the top) of one name, A→Z. */
export function subfoldersIn(folders: NameFolder[], key: string, parentId: number | null): NameFolder[] {
  return folders
    .filter((f) => f.nameKey === key && f.parentId === parentId)
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
}

/** The path from a name's top down to `id` (for the breadcrumb). A missing folder ends it. */
export function folderPath(folders: NameFolder[], id: number | null): NameFolder[] {
  const byId = new Map(folders.map((f) => [f.id, f]))
  const out: NameFolder[] = []
  const seen = new Set<number>()
  let cur = id == null ? undefined : byId.get(id)
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    out.unshift(cur)
    cur = cur.parentId == null ? undefined : byId.get(cur.parentId)
  }
  return out
}

/** A bank / card account on the Names tab: it holds that account's statements. */
export type AccountEntry = { name: string; card: boolean; statements: Statement[] }

/** One entry per account with read statements (unread ones have no account yet), A→Z. */
export function accountEntries(statements: Statement[]): AccountEntry[] {
  return groupByAccount(statements)
    .filter((f): f is typeof f & { account: string } => f.account !== null)
    .map((f) => ({ name: f.account, card: f.card, statements: f.statements }))
}
