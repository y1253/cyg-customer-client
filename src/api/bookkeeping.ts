import { ApiError, errorFrom, fetchWithAuth, handleUnauthorized } from './client'

/**
 * A bookkeeping call's credentials AND its book. step12c: `bookId` = one of the customer's
 * bookkeeping companies; `companyId` = a registered business's own book; neither = the
 * default book. Every `/api/bookkeeping` call goes through `bookFetch`, which adds the
 * param — the server's `BookScopeGuard` resolves (and checks) it.
 */
export type BookAuth = { token: string; companyId: number | null; bookId?: number | null }

/** The URL with the book added (nothing for the default book). */
export function bookUrl(auth: BookAuth, url: string): string {
  const sep = url.includes('?') ? '&' : '?'
  if (auth.bookId) return `${url}${sep}bookId=${auth.bookId}`
  if (auth.companyId !== null) return `${url}${sep}companyId=${auth.companyId}`
  return url
}

export function bookFetch(auth: BookAuth, url: string, options: RequestInit = {}): Promise<Response> {
  return fetchWithAuth(auth.token, bookUrl(auth, url), options)
}

/** A bookkeeping query key scoped to one book, so two books never share a cache entry. */
export function bookKey<K extends readonly unknown[]>(
  key: K,
  book: { bookId?: number | null; companyId: number | null },
) {
  return [
    ...key,
    book.bookId ? `book-${book.bookId}` : book.companyId !== null ? `company-${book.companyId}` : 'default',
  ] as const
}

/** UPLOADED = not read yet; reading starts when the customer clicks Generate. */
export type StatementStatus = 'UPLOADED' | 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED' | 'NEEDS_REVIEW'

export type Statement = {
  id: number
  filename: string
  sizeBytes: number
  status: StatementStatus
  error: string | null
  /** step2: the raw failure behind `error` (FAILED only) — shown under Details. */
  errorDetail?: string | null
  /** step8: the checks against the bank's totals that failed, in words (NEEDS_REVIEW only). */
  checks?: string[]
  /** step8: what the customer said was wrong with it (its chat) — used on every re-read. */
  customerNote?: string | null
  accountName: string | null
  /** BANK | CREDIT_CARD (null = read before it was recorded). */
  accountKind?: string | null
  /** ISO code of its amounts as read; null = not printed (the home currency). */
  currency?: string | null
  /** What it is converted from: the currency set for its account, else `currency`. */
  accountCurrency?: string | null
  bankName: string | null
  /** "Chase 4362 · Sep 2026" — the same label every ledger row of it shows. */
  label: string
  periodStart: string | null
  periodEnd: string | null
  transactionCount: number
  createdAt: string
  processedAt: string | null
  /** The customer filed it under this account themselves (a Retry keeps it there). */
  movedByCustomer?: boolean
  /** UPLOAD | SMS | WHATSAPP | EMAIL | PLAID (a month built from a connected bank — no file). */
  source?: string
  /**
   * Set when this statement STARTS its account's books — a "Starting balance" row in the
   * ledger. Only the statements list carries it.
   */
  /** `derived` (step2, 2026-11-13): its opening was not read — worked out from its closing balance (CLOSING), or $0 (ZERO). */
  startingBalance?: { date: string | null; amount?: number; derived?: StartDerived; reason?: StartReason } | null
  /**
   * step2 (2026-11-11): what is wrong with it, said plainly (null = nothing): its rows don't
   * match its balance, it doesn't carry over from the previous statement, statements are
   * missing before it, or no balance could be read.
   */
  problem?: StatementProblem | null
  /**
   * step9 (2026-11-15): every open problem, SAVED on the server (`StatementError`), worst
   * first — `problem` is the first. Only the statements list carries it.
   */
  errors?: StatementError[]
  /** step2 (2026-11-12): the printed balances as read (null = not read). */
  openingBalance?: number | null
  closingBalance?: number | null
  /** Where it ends: the printed closing, else opening ± its rows (a card: the amount owed). */
  endingBalance?: number | null
}

export type StatementProblemKind =
  | 'BALANCE'
  | 'ENDING'
  | 'RUNNING'
  | 'MISMATCH'
  | 'MISSING'
  | 'NO_OPENING'
  | 'NO_BALANCES'
  /** step9: recorded by the AI (no check sees it). */
  | 'OTHER'
export type StatementProblem = { kind: StatementProblemKind; title: string; text: string }

/** step9: one saved statement error. `source` SYSTEM = a check found it, AI = the AI recorded it. */
export interface StatementError {
  id: number
  statementId: number
  kind: StatementProblemKind
  title: string
  text: string
  source: 'SYSTEM' | 'AI'
  createdAt: string
}

/**
 * Why an account starts again at a statement (the server's `StartReason`): MISSING = no
 * statement covers `from` – `to` (`to` null = up to a statement that printed no start);
 * MISMATCH = the periods touch, but the previous closing is not this opening.
 */
export type StartReason =
  | {
      kind: 'MISSING'
      previousStatementId: number
      from: string
      to: string | null
      /** Where the previous statement ended / this one opens (step2, 2026-11-12). */
      previousClosing?: number | null
      opening?: number | null
    }
  | {
      kind: 'MISMATCH'
      previousStatementId: number
      previousEnd: string | null
      previousClosing: number | null
      opening: number
    }
  /** The statement before it needs review (out of the books), so the books start again here. */
  | { kind: 'REVIEW'; previousStatementId: number; previousEnd: string | null }

export type LedgerTransaction = {
  /** Unique per row (`t:`, `s:` split, `o:` starting balance, `x:` tax line) — use as the React key. */
  key: string
  /** The transaction's id; on a tax row, the id of the row it taxes (a transaction or a split). */
  id: number
  /** On a split, and on a split's tax lines: the transaction it was split from. */
  splitOfId?: number
  /** step9 (2026-11-17): on a split of a split, the split it was cut from. */
  parentSplitId?: number
  /** step9 (2026-11-17): on a split, how deep it sits (0 = cut from the transaction). */
  depth?: number
  statementId: number
  pendingDate: string | null
  postingDate: string | null
  description: string
  /** The payee / payer the AI read out of the description ("Walmart"); null when none. */
  name: string | null
  /** The receipt line the row is for ("Pampers") — the Product column. */
  itemName?: string | null
  /**
   * step2 (2026-11-15): a split filed under a sub-name of its name ("Walmart - Maintenance")
   * with that sub-name's category. `name` stays the parent name.
   */
  subName?: { id: number; name: string }
  /** step9: renamed ONE time — the name its description's rules give (it is an exception from it). */
  exception?: { main: string }
  amount: number
  offsetAccount: string
  debitAccount: string
  creditAccount: string
  /** The statement it came from, e.g. "Chase 4362 · Sep 2026". */
  statementLabel: string
  /**
   * `opening`: the statement's printed starting balance, offset to Owner's Loan.
   * `split`: a part split off the transaction above (by hand, or by a split rule), with its own name and
   * category; the transaction shows what is left of it.
   */
  kind?: 'opening' | 'split' | 'fx'
  /** step9 part 4: on a split a split rule wrote — that rule. */
  splitRule?: { id: number; name: string }
  /**
   * A row of a statement in another currency than the home one: its currency, the rate of its day (null = not
   * known yet) and the amount converted. An `fx` row is the revaluation at a foreign statement's end: 0 in its
   * currency, the home-currency difference to Exchange Gain or Loss.
   */
  currency?: string
  fxRate?: number | null
  homeAmount?: number
  /** On a transaction row: its receipts, cheques and voice notes. */
  attachments?: Array<{ id: number; kind: AttachmentKind; filename: string }>
}

export type AttachmentKind =
  | 'RECEIPT'
  | 'CHECK'
  | 'AUDIO'
  | 'TEXT'
  | 'OTHER'
  /** step11b: a supplier's bill. */
  | 'INVOICE'
  | 'DEPOSIT_SLIP'
  /** step11b: not a payment — a letter, a request, a screenshot. Never matched. */
  | 'DOCUMENT'

/**
 * One hand-made split as the customer edits it: `amount` is positive, it takes the transaction's sign.
 * `itemName` is the receipt line it is for; `always` remembers that item's category for later receipts.
 */
export type SplitInput = {
  id?: number
  name: string | null
  itemName?: string | null
  category: string
  amount: number
  always?: boolean
}

export type ExportFormat = 'xlsx' | 'pdf'

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'

export type AccountBalance = {
  name: string
  type: AccountType
  /** The bank / card account itself — the cash side of every entry. */
  bank: boolean
  /** On the account's normal side: $50 of office supplies is +50, a refund lowers it. */
  balance: number
  count: number
  /** A statement account's currency (absent when its statements disagree). */
  currency?: string
  /** A foreign statement account's balance before conversion (`balance` is converted). */
  foreignBalance?: number
  /** A statement account: where its books start, up to the period's end (step2, 2026-11-12). */
  starts?: ReportStart[]
  /** step9 (2026-11-15): a statement account's open statement errors, every one. */
  errors?: AccountStatementError[]
}

/**
 * step9 (2026-11-15): one open error of a statement filed under an account, as the Balance
 * sheet and the Chart of accounts show it under the account's name.
 */
export type AccountStatementError = {
  statementId: number
  /** "Chase 4362 · Sep 2026". */
  statement: string
  kind: StatementProblemKind
  title: string
  text: string
  source: 'SYSTEM' | 'AI'
}

/**
 * Where a statement account's books start (the server's `ReportStart`): `amount` in the
 * account's own currency, on the side its balance is shown (a card's amount OWED).
 */
export type ReportStart = { date: string | null; amount?: number; derived?: StartDerived; reason?: StartReason }

/** How a start whose opening was not read got its amount (see `Statement.startingBalance`). */
export type StartDerived = 'CLOSING' | 'ZERO'

export type ReportLine = {
  name: string
  amount: number
  /** A statement account (bank / card) itself. */
  bank?: boolean
  /** Income statement only: the account's total per payee, largest first. */
  byName?: ReportLine[]
  /** A foreign statement account: its currency and `amount` before conversion. */
  currency?: string
  foreignAmount?: number
  /** Balance sheet, statement accounts: where its books start. More than one = a break. */
  starts?: ReportStart[]
  /** step9 (2026-11-15): a statement account's open statement errors, every one. */
  errors?: AccountStatementError[]
}

/** `GET /api/bookkeeping/reports` — chart of accounts + income statement for the period, balance sheet as of its end. */
export type Reports = {
  from: string | null
  to: string | null
  accounts: AccountBalance[]
  incomeStatement: {
    income: ReportLine[]
    totalIncome: number
    expenses: ReportLine[]
    totalExpenses: number
    netIncome: number
  }
  balanceSheet: {
    asOf: string | null
    assets: ReportLine[]
    totalAssets: number
    liabilities: ReportLine[]
    totalLiabilities: number
    equity: ReportLine[]
    totalEquity: number
    totalLiabilitiesAndEquity: number
    balanced: boolean
  }
  uncategorized: { count: number; amount: number }
  /** Accounts the customer moved to another section (they can be put back). */
  moved?: string[]
}

/** A report period as YYYY-MM-DD; null on either side = open-ended. */
export type Period = { from: string | null; to: string | null }

/** Server-side ceilings — mirrored so the picker can refuse before uploading. */
export const MAX_STATEMENT_BYTES = 50 * 1024 * 1024
/** Files per request. The client sends batches, so a customer can upload any number. */
export const UPLOAD_BATCH = 10

/** Statements we could not read: failed outright, or read but not adding up (needs review). */
export const unreadable = (s: Statement): boolean => s.status === 'FAILED' || s.status === 'NEEDS_REVIEW'

/** step2: could not be read, or read with a problem the customer should fix (`problem`). */
export const hasProblem = (s: Statement): boolean => unreadable(s) || !!s.problem

/**
 * A problem statement "Re-read all" takes — the server's twin is `rereadable` in
 * bookkeeping.service.ts. Never a bank-feed month, nor a MISSING gap (only uploading the
 * missing statement fixes that).
 */
export function rereadable(s: Pick<Statement, 'status' | 'source' | 'problem'>): boolean {
  if (s.source === 'PLAID') return false
  if (s.status === 'FAILED' || s.status === 'NEEDS_REVIEW') return true
  return s.status === 'DONE' && !!s.problem && s.problem.kind !== 'MISSING'
}

/** How a row with no payee is listed (never stored — the DB keeps null). */
export const UNCLARIFIED_NAME = 'Unclarified name'

export function isBusy(s: Statement): boolean {
  return s.status === 'PENDING' || s.status === 'PROCESSING'
}

export async function fetchStatements(auth: BookAuth): Promise<Statement[]> {
  const res = await bookFetch(auth, '/api/bookkeeping/statements')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function fetchTransactions(auth: BookAuth): Promise<LedgerTransaction[]> {
  const res = await bookFetch(auth, '/api/bookkeeping/transactions')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function fetchReports(auth: BookAuth, period: Period): Promise<Reports> {
  const qs = new URLSearchParams()
  if (period.from) qs.set('from', period.from)
  if (period.to) qs.set('to', period.to)
  const res = await bookFetch(auth, `/api/bookkeeping/reports${qs.size ? `?${qs}` : ''}`)
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/**
 * One batch of PDFs. XHR rather than fetch so the upload reports progress — a batch of
 * scanned statements can be tens of megabytes.
 */
export function uploadStatements(
  auth: BookAuth,
  files: File[],
  onProgress: (fraction: number) => void,
): Promise<Statement[]> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f, f.name))
    const xhr = new XMLHttpRequest()
    xhr.open('POST', bookUrl(auth, '/api/bookkeeping/statements'))
    xhr.setRequestHeader('Authorization', `Bearer ${auth.token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      if (xhr.status === 401) {
        handleUnauthorized()
        return reject(new Error('Please log in again'))
      }
      let body: unknown = null
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(body as Statement[])
      const message = (body as { message?: string | string[] } | null)?.message
      reject(
        new Error(
          xhr.status === 413
            ? 'These files are too large to upload at once.'
            : (Array.isArray(message) ? message[0] : message) ?? 'The upload failed. Please try again.',
        ),
      )
    }
    xhr.onerror = () => reject(new Error('The upload failed — check your connection and try again.'))
    xhr.send(form)
  })
}

export async function deleteStatement(auth: BookAuth, id: number): Promise<void> {
  const res = await bookFetch(auth, `/api/bookkeeping/statements/${id}`, { method: 'DELETE' })
  if (!res.ok) throw await errorFrom(res)
}

export async function retryStatement(auth: BookAuth, id: number): Promise<Statement> {
  const res = await bookFetch(auth, `/api/bookkeeping/statements/${id}/retry`, {
    method: 'POST',
  })
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** "Re-read all" under the Problems filter: every statement `rereadable` says, read again. */
export async function retryProblemStatements(auth: BookAuth): Promise<{ queued: number }> {
  const res = await bookFetch(auth, '/api/bookkeeping/statements/retry-problems', {
    method: 'POST',
  })
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** File a statement under another account (the folder it was dragged into). */
export async function moveStatement(auth: BookAuth, id: number, accountName: string): Promise<Statement> {
  const res = await bookFetch(auth, `/api/bookkeeping/statements/${id}/account`, json('PATCH', { accountName }))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** Fetches a protected file and hands it to the browser as a download. */
async function saveBlob(res: Response, fallbackName: string): Promise<void> {
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** The whole ledger — every statement combined — as Excel or PDF. */
export async function downloadLedger(auth: BookAuth, format: ExportFormat): Promise<void> {
  const res = await bookFetch(auth, `/api/bookkeeping/export?format=${format}`)
  if (!res.ok) throw await errorFrom(res)
  await saveBlob(res, `ledger.${format}`)
}

/** Opens the original uploaded PDF in a new tab (the route needs the Bearer token, so no plain link). */
export async function openOriginal(auth: BookAuth, id: number): Promise<void> {
  // Open the tab synchronously, inside the click, or popup blockers eat it.
  const tab = window.open('', '_blank')
  const res = await bookFetch(auth, `/api/bookkeeping/statements/${id}/file`)
  if (!res.ok) {
    tab?.close()
    throw await errorFrom(res)
  }
  const url = URL.createObjectURL(await res.blob())
  if (tab) tab.location.href = url
  else window.location.href = url
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** step9 part 4 (2026-11-15): a split rule's direction — SALES = In (money received), PURCHASE = Out (money spent). */
export type TaxKind = 'SALES' | 'PURCHASE'

export type RateMode = 'PERCENT' | 'FIXED'

export type SplitRuleRate = {
  kind: TaxKind
  mode: RateMode
  /** PERCENT: a percent, 10 = 10% (included in the amount). */
  rate: number
  /** FIXED: the amount split out of each row. */
  amount: number | null
}

/**
 * step9 part 4: a SPLIT RULE (was "tax agency"; the API still says agencies). Picked for a name it splits the
 * name's rows once — the splits are regular splits afterwards.
 */
export type TaxAgency = {
  id: number
  name: string
  /** At most one per direction, In first. */
  rates: SplitRuleRate[]
  /** Where its splits post; null = the rule's own name. */
  category: string | null
  /** step9 (2026-11-18): whether it splits — for a rule in a group, its group's switch. */
  active: boolean
  /** step9 (2026-11-17): its split group; null = an individual rule. */
  groupId: number | null
}

/**
 * step9 (2026-11-17): a SPLIT GROUP — its rules run together on the same amount (one included denominator) and are
 * picked on a name as one. An individual rule cuts what the rules before it left.
 */
export type SplitGroup = {
  id: number
  name: string
  /** step9 (2026-11-18): its rules' on / off switch — a rule in a group has none of its own. */
  active: boolean
  /** Its live rules, oldest first. */
  agencyIds: number[]
}

export type TaxAgencyInput = Omit<TaxAgency, 'id' | 'rates'> & {
  rates: Array<{ kind: TaxKind; mode: RateMode; rate?: number; amount?: number }>
}

/** The customer's split rules. Which names they split is picked per NAME (Names tab). */
export type TaxSettings = {
  agencies: TaxAgency[]
  groups: SplitGroup[]
}

export const TAX_KIND_LABEL: Record<TaxKind, string> = {
  SALES: 'In',
  PURCHASE: 'Out',
}

/** "In 5%" / "Out $2.00". */
export function rateLabel(r: SplitRuleRate): string {
  const value =
    r.mode === 'FIXED'
      ? `$${(r.amount ?? 0).toFixed(2)}`
      : `${r.rate.toLocaleString(undefined, { maximumFractionDigits: 3 })}%`
  return `${TAX_KIND_LABEL[r.kind]} ${value}`
}

/** What a payee is, from its category: income → customer, expense → supplier. */
export type NameType = 'CUSTOMER' | 'SUPPLIER' | 'OTHER'

/** One AI-read payee name on the Names tab. */
export type LedgerName = {
  name: string
  /** Its most frequent category. */
  category: string
  /** How many other categories its rows have. */
  otherCategories: number
  type: NameType
  rows: number
  /** What its rows add up to, as the bank moved it (splits included). */
  total: number
  /** The split rules picked for this name — none = the default. */
  agencyIds: number[]
  /** step9 (2026-11-19): its pick is one rule of a split group taken on its own. */
  agencyAlone: boolean
  /** The descriptions the AI put under this name. */
  descriptions: NameDescription[]
  /** step9: the "description contains …" rules that give rows this name. */
  followsContains?: Array<{ key: string; text: string; category: string | null; rows: number }>
  /** step9: this name's rows that are one-time exceptions from another name. */
  exceptionOf?: Array<{ main: string; key: string; description: string; rows: number }>
  /** step9: its Names-tab group key (CUSTOMER | SUPPLIER | OTHER | g<id>). */
  group?: string
  /** step2 (2026-11-09): the customer's own profile fields (phone, email, address, …). */
  fields?: NameField[]
  /** What an edit of this name saves under (a NAME rule with this key). */
  ruleKey: string
  /** The customer's own change behind this row — what "Reset to default" removes. */
  rule: NameRuleRef | null
  /**
   * The rows with NO payee name, listed as one name ("Unclarified name", Uncategorized). Nothing is stored;
   * each of its descriptions is assigned from `NamesData.unrecognized`.
   */
  unclarified?: true
}

export type NameRuleMatch = 'NAME' | 'DESCRIPTION' | 'CONTAINS'
export type NameRuleRef = { matchType: NameRuleMatch; matchKey: string }

/** Rows the AI found no payee name for, grouped by description. */
export type UnrecognizedName = {
  /** The description key — what an assignment saves under. */
  key: string
  /** One of the descriptions, as printed. */
  sampleDescription: string
  category: string
  otherCategories: number
  rows: number
  /** What its rows add up to. */
  total: number
  rule: NameRuleRef | null
}

/** "Every description that contains …" — the customer's own rule (step2). */
export type ContainsRule = {
  /** The text, as typed. */
  text: string
  /** What it is saved under — the `matchKey` an edit or a reset sends. */
  key: string
  name: string | null
  category: string | null
  /** Ledger rows whose description contains it now. */
  rows: number
}

export type NamesData = {
  names: LedgerName[]
  unrecognized: UnrecognizedName[]
  /** step9: only the category-only contains rules — the others sit inside their name. */
  containsRules: ContainsRule[]
  /** step9: the Names-tab groups — Suppliers, Customers, Other, then the customer's own. */
  groups?: NameGroup[]
  /**
   * step9 (2026-11-17, second request): each sub-name's descriptions, by sub-name id — a name
   * with sub-names is only a wrapper; its sub-names hold its descriptions.
   */
  subDescriptions?: Record<number, NameDescription[]>
  /** step9 (2026-11-17, third request): each sub-name's "description contains" rules, by id. */
  subContains?: Record<number, Array<{ key: string; text: string; category: string | null; rows: number }>>
}

/** step2 (2026-11-09): what a name's profile field holds. */
export type NameFieldKind = 'PHONE' | 'EMAIL' | 'ADDRESS' | 'WEBSITE' | 'NOTE' | 'TEXT'

/** step2 (2026-11-09): one field of a name's profile; `label` may be '' (the kind's own label). */
export type NameField = { kind: NameFieldKind; label: string; value: string }

/** step9: a Names-tab group; `id` is set on one the customer made. */
export type NameGroup = { key: string; label: string; id?: number }

/** step9: a name whose rows' bank descriptions match the Names-tab search. */
export type NameSearchHit = { name: string; key: string; description: string }

/** Where a product's category came from: your own choice, the AI (remembered), or the transaction's. */
export type ProductSource = 'rule' | 'memory' | 'parent'

/** One item read off the customer's receipts (Products tab). */
export type Product = {
  itemKey: string
  name: string
  category: string
  source: ProductSource
  /** What the AI chose for it, null when it knows nothing. */
  suggested: string | null
  rows: number
  total: number
}

/** One account of the fixed chart of accounts. */
/** One category a customer may pick: the fixed chart, plus their own (`custom`). */
export type ChartAccount = { name: string; type: AccountType; custom: boolean }

/** How far an edit reaches: saved for the future, or only the rows changed now. */
export type EditScope = 'ALWAYS' | 'ONCE'

/** One link a rule save would take from another name (step2, the server's `LinkConflict`). */
export interface RuleConflictLink {
  matchType: 'DESCRIPTION' | 'CONTAINS'
  /** The description as printed, or the contained text as typed. */
  text: string
  /** The name it is linked to now. */
  name: string
}

/**
 * The 409 `RULE_CONFLICT` of a name rule save: the description (or text) is already linked
 * to another name. Saving again with `replace: true` moves it. Null for any other error
 * (a conflict with no links — two saves at once — is just its message).
 */
export function ruleConflictOf(error: unknown): RuleConflictLink[] | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null
  const body = error.body as { code?: string; conflicts?: RuleConflictLink[] } | null
  if (body?.code !== 'RULE_CONFLICT' || !body.conflicts?.length) return null
  return body.conflicts
}

/** The shortest text a "description contains" rule may look for — the server's `CONTAINS_MIN`. */
export const CONTAINS_MIN = 3

/**
 * One description the AI put under a name, with the category its rows mostly have — and
 * (step9) its key, the customer's rule that ties it to the name, and its exceptions.
 */
export type NameDescription = {
  key?: string
  description: string
  category: string
  rows: number
  rule?: {
    id: number
    matchType: 'DESCRIPTION' | 'CONTAINS'
    matchKey: string
    text: string
    /** step9 (2026-11-17): a rule saved from a split files its rows under this sub-name. */
    subName?: string
  } | null
  /** Rows of it renamed ONE time — exceptions from this name, under the names they carry now. */
  exceptions?: Array<{ name: string; rows: number }>
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

/** Reads every not-yet-read statement. */
export async function generate(auth: BookAuth): Promise<{ queued: number; taxing: boolean }> {
  const res = await bookFetch(auth, '/api/bookkeeping/generate', { method: 'POST' })
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function fetchTax(auth: BookAuth): Promise<TaxSettings> {
  const res = await bookFetch(auth, '/api/bookkeeping/tax')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** The home currency the books are kept in, and the ones there are daily rates for. */
export type CurrencySettings = { home: string; currencies: string[] }

export async function fetchCurrency(auth: BookAuth): Promise<CurrencySettings> {
  const res = await bookFetch(auth, '/api/bookkeeping/currency')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function updateCurrency(auth: BookAuth, home: string): Promise<CurrencySettings> {
  const res = await bookFetch(auth, '/api/bookkeeping/currency', json('PUT', { home }))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function saveAgency(
  auth: BookAuth,
  values: Partial<TaxAgencyInput> & { id?: number },
): Promise<TaxAgency> {
  const { id, ...body } = values
  const res = await bookFetch(
    auth,
    id ? `/api/bookkeeping/agencies/${id}` : '/api/bookkeeping/agencies',
    json(id ? 'PATCH' : 'POST', body),
  )
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function deleteAgency(auth: BookAuth, id: number): Promise<void> {
  const res = await bookFetch(auth, `/api/bookkeeping/agencies/${id}`, { method: 'DELETE' })
  if (!res.ok) throw await errorFrom(res)
}

/** step9 (2026-11-17): create (no id) or rename a split group. */
export async function saveSplitGroup(
  auth: BookAuth,
  values: { id?: number; name?: string; active?: boolean },
): Promise<SplitGroup> {
  const { id, ...body } = values
  const res = await bookFetch(
    auth,
    id ? `/api/bookkeeping/split-groups/${id}` : '/api/bookkeeping/split-groups',
    json(id ? 'PATCH' : 'POST', body),
  )
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** Removes the group; its rules become individual rules and names keep them. */
export async function deleteSplitGroup(auth: BookAuth, id: number): Promise<void> {
  const res = await bookFetch(auth, `/api/bookkeeping/split-groups/${id}`, { method: 'DELETE' })
  if (!res.ok) throw await errorFrom(res)
}

export async function fetchNames(auth: BookAuth): Promise<NamesData> {
  const res = await bookFetch(auth, '/api/bookkeeping/names')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/**
 * The split rules of one name — the whole set. A rule added splits the name's existing rows now, once (and every
 * new row later); one removed leaves the splits it made.
 */
export async function setNameAgencies(
  auth: BookAuth,
  values: { name: string; agencyIds: number[]; alone?: boolean },
): Promise<NamesData> {
  const res = await bookFetch(auth, '/api/bookkeeping/names/agencies', json('PUT', values))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/**
 * Save the customer's own name and/or category. It is applied to their existing rows at
 * once and to every statement they upload from now on; null leaves that value as it is.
 */
export async function saveNameRule(
  auth: BookAuth,
  values: NameRuleRef & {
    name: string | null
    category: string | null
    scope: EditScope
    /** step2: take the description from the name it is linked to now (after a RULE_CONFLICT). */
    replace?: boolean
    /** step9 (2026-11-17, second request): DESCRIPTION — the sub-name of `name` its rows go under. */
    subNameId?: number | null
  },
): Promise<NamesData> {
  const res = await bookFetch(auth, '/api/bookkeeping/names/rule', json('PUT', values))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** step9: names whose rows' bank descriptions contain `q`. */
export async function searchNames(auth: BookAuth, q: string): Promise<NameSearchHit[]> {
  const res = await bookFetch(auth, `/api/bookkeeping/names/search?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** step9: put a name in a Names-tab group; null = back to following its category. */
export async function setNameGroup(
  auth: BookAuth,
  values: { name: string; group: string | null },
): Promise<NamesData> {
  const res = await bookFetch(auth, '/api/bookkeeping/names/group', json('PUT', values))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** step2 (2026-11-09): a name's whole profile ([] clears it). A phone comes back in E.164. */
export async function setNameFields(
  auth: BookAuth,
  values: { name: string; fields: NameField[] },
): Promise<NamesData> {
  const res = await bookFetch(auth, '/api/bookkeeping/names/fields', json('PUT', values))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** step9: the customer's own Names-tab groups ("Employees"). */
export async function saveNameGroup(
  auth: BookAuth,
  values: { id?: number; name: string },
): Promise<NamesData> {
  const res = await bookFetch(
    auth,
    values.id ? `/api/bookkeeping/name-groups/${values.id}` : '/api/bookkeeping/name-groups',
    json(values.id ? 'PATCH' : 'POST', { name: values.name }),
  )
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function deleteNameGroup(auth: BookAuth, id: number): Promise<NamesData> {
  const res = await bookFetch(auth, `/api/bookkeeping/name-groups/${id}`, { method: 'DELETE' })
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/**
 * step9 (2026-11-17, third request): one end of a merge — a name, or a sub-name (`subId`).
 * `category` is only for the confirm text.
 */
export type MergeEnd = {
  name: string
  subId?: number
  category?: string
  /** step9 (2026-11-18): a name with sub-names — the merge lands on its sub-name of the same category. */
  wrapper?: boolean
}

/**
 * step8: merge name `from` into `into` (it takes `into`'s name, category and tax).
 * step9 (2026-11-17, third request): either end may be a sub-name.
 */
export async function mergeNames(auth: BookAuth, ends: { from: MergeEnd; into: MergeEnd }): Promise<NamesData> {
  const values = {
    ...(ends.from.subId ? { fromSubNameId: ends.from.subId } : { from: ends.from.name }),
    ...(ends.into.subId ? { intoSubNameId: ends.into.subId } : { into: ends.into.name }),
  }
  const res = await bookFetch(auth, '/api/bookkeeping/names/merge', json('POST', values))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/**
 * step8: merge account `from` into `into` — its rows, rules and (for two folders) statements.
 * step2: `name` = what the merged account is called (default `into`).
 */
export async function mergeAccounts(
  auth: BookAuth,
  values: { from: string; into: string; name?: string },
): Promise<void> {
  const res = await bookFetch(auth, '/api/bookkeeping/accounts/merge', json('POST', values))
  if (!res.ok) throw await errorFrom(res)
}

/** step2: rename an account everywhere (rows, rules, its Bank feeds folder, the connected bank). */
export async function renameAccount(auth: BookAuth, values: { from: string; to: string }): Promise<void> {
  const res = await bookFetch(auth, '/api/bookkeeping/accounts/rename', json('POST', values))
  if (!res.ok) throw await errorFrom(res)
}

/** Drop the customer's own change: the rows go back to the default. */
export async function resetNameRule(auth: BookAuth, values: NameRuleRef): Promise<NamesData> {
  const res = await bookFetch(auth, '/api/bookkeeping/names/rule', json('DELETE', values))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function fetchProducts(auth: BookAuth): Promise<Product[]> {
  const res = await bookFetch(auth, '/api/bookkeeping/products')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/**
 * Always put this item in this category: applied to the customer's existing rows of it at
 * once and to every receipt from now on.
 */
export async function saveProductRule(
  auth: BookAuth,
  values: { itemKey: string; category: string },
): Promise<Product[]> {
  const res = await bookFetch(auth, '/api/bookkeeping/products/rule', json('PUT', values))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** Drop the customer's own category: the item goes back to the AI's / the transaction's. */
export async function resetProductRule(auth: BookAuth, values: { itemKey: string }): Promise<Product[]> {
  const res = await bookFetch(auth, '/api/bookkeeping/products/rule', json('DELETE', values))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** Change one ledger row's name and/or category — only that row, or always for its payee. */
export async function editTransaction(
  auth: BookAuth,
  id: number,
  values: { name: string | null; category: string | null; scope: EditScope; replace?: boolean },
): Promise<void> {
  const res = await bookFetch(auth, `/api/bookkeeping/transactions/${id}`, json('PATCH', values))
  if (!res.ok) throw await errorFrom(res)
}

/** A transaction's whole set of splits: listed ones kept or made, the rest removed (empty = un-split). */
export async function saveSplits(auth: BookAuth, id: number, splits: SplitInput[]): Promise<void> {
  const res = await bookFetch(auth, `/api/bookkeeping/transactions/${id}/splits`, json('PUT', { splits }))
  if (!res.ok) throw await errorFrom(res)
}

/** step2 (2026-11-15): one split edited in place — only the fields sent change. */
export interface SplitEdit {
  /** Positive, as typed (with its tax); 0 allowed. */
  amount?: number
  name?: string
  /** ONCE = this split only; ALWAYS = the transaction's description goes to the name. */
  nameScope?: EditScope
  replace?: boolean
  category?: string
  /** ALL = the name's category (the transaction too); SUB = this split, as a sub-name. */
  categoryScope?: 'ALL' | 'SUB'
  /** '' clears it. */
  itemName?: string
  always?: boolean
}

/** step2 (2026-11-15): Split = one more split at $0.00, a copy of the row clicked. */
export async function duplicateSplit(auth: BookAuth, id: number): Promise<{ id: number }> {
  const res = await bookFetch(auth, `/api/bookkeeping/transactions/${id}/splits/duplicate`, { method: 'POST' })
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function editSplit(auth: BookAuth, id: number, values: SplitEdit): Promise<void> {
  const res = await bookFetch(auth, `/api/bookkeeping/transactions/${id}/split`, json('PATCH', values))
  if (!res.ok) throw await errorFrom(res)
}

export async function deleteSplit(auth: BookAuth, id: number): Promise<void> {
  const res = await bookFetch(auth, `/api/bookkeeping/transactions/${id}/split`, { method: 'DELETE' })
  if (!res.ok) throw await errorFrom(res)
}

/** step2 (2026-11-15): a transaction's Product column ('' clears it). */
export async function setProduct(auth: BookAuth, id: number, itemName: string): Promise<void> {
  const res = await bookFetch(auth, `/api/bookkeeping/transactions/${id}/product`, json('PATCH', { itemName }))
  if (!res.ok) throw await errorFrom(res)
}

/** step2 (2026-11-15): a sub-name of a name ("Walmart - Maintenance") with its own category. */
export interface SubName {
  id: number
  parent: string
  name: string
  category: string
  rows: number
  /** step9: Σ of its money (bank sign). */
  total: number
  /**
   * step9 part 3: every setting a name has. `group` null = its parent's; `renamed` = the
   * customer named it; `ownAgencies` = split by its own rules `agencyIds`, else by the parent's.
   */
  group: string | null
  fields: NameField[]
  renamed: boolean
  ownAgencies: boolean
  agencyIds: number[]
  /** step9 (2026-11-19): its pick is one rule of a split group taken on its own. */
  agencyAlone: boolean
  /** step9 (2026-11-17): it holds a split rule's splits ("Walmart - GST") — it can't be merged or dragged. */
  fromRule: boolean
}

/** step9 part 3: what a sub-name's settings save changes (absent = unchanged). */
export type SubNameSettings = {
  /** '' = back to "<parent> - <category>". */
  name?: string
  group?: string | null
  fields?: NameField[]
  /** null = follow the parent's split rules; [] = none. */
  agencyIds?: number[] | null
  /** step9 (2026-11-19): `agencyIds` is one rule of a split group picked on its own. */
  alone?: boolean
}

export async function setSubNameSettings(auth: BookAuth, id: number, body: SubNameSettings): Promise<void> {
  const res = await bookFetch(auth, `/api/bookkeeping/sub-names/${id}/settings`, json('PATCH', body))
  if (!res.ok) throw await errorFrom(res)
}

export async function fetchSubNames(auth: BookAuth): Promise<SubName[]> {
  const res = await bookFetch(auth, '/api/bookkeeping/sub-names')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function setSubNameCategory(auth: BookAuth, id: number, category: string): Promise<void> {
  const res = await bookFetch(auth, `/api/bookkeeping/sub-names/${id}`, json('PATCH', { category }))
  if (!res.ok) throw await errorFrom(res)
}

export async function deleteSubName(auth: BookAuth, id: number): Promise<void> {
  const res = await bookFetch(auth, `/api/bookkeeping/sub-names/${id}`, { method: 'DELETE' })
  if (!res.ok) throw await errorFrom(res)
}

/** A category of the customer's own, for when nothing in the list fits. */
export async function createAccount(
  auth: BookAuth,
  values: { name: string; type: AccountType },
): Promise<ChartAccount> {
  const res = await bookFetch(auth, '/api/bookkeeping/accounts', json('POST', values))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** Move an account to another section of the chart / balance sheet; `type: null` puts it back. */
export async function setAccountType(
  auth: BookAuth,
  values: { account: string; type: AccountType | null },
): Promise<void> {
  const res = await bookFetch(
    auth,
    '/api/bookkeeping/accounts/type',
    values.type
      ? json('PUT', values)
      : json('DELETE', { account: values.account }),
  )
  if (!res.ok) throw await errorFrom(res)
}

/** Set the currency a statement account's statements are converted from; `currency: null` = what each statement says. */
export async function setAccountCurrency(
  auth: BookAuth,
  values: { account: string; currency: string | null },
): Promise<void> {
  const res = await bookFetch(
    auth,
    '/api/bookkeeping/accounts/currency',
    values.currency ? json('PUT', values) : json('DELETE', { account: values.account }),
  )
  if (!res.ok) throw await errorFrom(res)
}

/** The fixed chart of accounts plus the customer's own — the categories a name can be given. */
export async function fetchAccounts(auth: BookAuth): Promise<ChartAccount[]> {
  const res = await bookFetch(auth, '/api/bookkeeping/accounts')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** React Query keys — one place, so every invalidation hits what the views read. */
export const STATEMENTS_KEY = ['bookkeeping', 'statements'] as const
export const TRANSACTIONS_KEY = ['bookkeeping', 'transactions'] as const
/** Prefix — the hook appends the period. */
export const REPORTS_KEY = ['bookkeeping', 'reports'] as const
export const TAX_KEY = ['bookkeeping', 'tax'] as const
export const CURRENCY_KEY = ['bookkeeping', 'currency'] as const
export const NAMES_KEY = ['bookkeeping', 'names'] as const
export const PRODUCTS_KEY = ['bookkeeping', 'products'] as const
export const ACCOUNTS_KEY = ['bookkeeping', 'accounts'] as const
export const ATTACHMENTS_KEY = ['bookkeeping', 'attachments'] as const
export const INTAKE_KEY = ['bookkeeping', 'intake'] as const
