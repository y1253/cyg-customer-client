import { errorFrom, fetchWithAuth, handleUnauthorized } from './client'

/**
 * A bookkeeping call's credentials AND its book (step8): the general book (`companyId:
 * null`) or one business's. Every `/api/bookkeeping` call goes through `bookFetch`, which
 * adds `?companyId=` — the server's `BookScopeGuard` resolves (and checks) it.
 */
export type BookAuth = { token: string; companyId: number | null }

/** The URL with the book's `companyId` added (nothing for the general book). */
export function bookUrl(auth: BookAuth, url: string): string {
  if (auth.companyId === null) return url
  return `${url}${url.includes('?') ? '&' : '?'}companyId=${auth.companyId}`
}

export function bookFetch(auth: BookAuth, url: string, options: RequestInit = {}): Promise<Response> {
  return fetchWithAuth(auth.token, bookUrl(auth, url), options)
}

/** A bookkeeping query key scoped to one book, so two books never share a cache entry. */
export function bookKey<K extends readonly unknown[]>(key: K, companyId: number | null) {
  return [...key, companyId ?? 'general'] as const
}

/** UPLOADED = not read yet; reading starts when the customer clicks Generate. */
export type StatementStatus = 'UPLOADED' | 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED' | 'NEEDS_REVIEW'

export type Statement = {
  id: number
  filename: string
  sizeBytes: number
  status: StatementStatus
  error: string | null
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
  startingBalance?: { date: string | null; amount: number } | null
}

export type LedgerTransaction = {
  /** Unique per row (`t:`, `s:` split, `o:` starting balance, `x:` tax line) — use as the React key. */
  key: string
  /** The transaction's id; on a tax row, the id of the row it taxes (a transaction or a split). */
  id: number
  /** On a split, and on a split's tax lines: the transaction it was split from. */
  splitOfId?: number
  statementId: number
  pendingDate: string | null
  postingDate: string | null
  description: string
  /** The payee / payer the AI read out of the description ("Walmart"); null when none. */
  name: string | null
  /** On a split made for a receipt line: that line ("Pampers"). */
  itemName?: string | null
  amount: number
  offsetAccount: string
  debitAccount: string
  creditAccount: string
  /** The statement it came from, e.g. "Chase 4362 · Sep 2026". */
  statementLabel: string
  /**
   * `opening`: the statement's printed starting balance, offset to Owner's Loan.
   * `tax`: an agency's tax on the transaction right above it, taken OUT of it — the row above shows its amount
   * without tax, and the two add back to what the bank moved.
   * `split`: a part the customer split off the transaction above by hand, with its own name, category and
   * taxes; the transaction shows what is left of it.
   */
  kind?: 'opening' | 'tax' | 'split' | 'fx'
  /**
   * A row of a statement in another currency than the home one: its currency, the rate of its day (null = not
   * known yet) and the amount converted. An `fx` row is the revaluation at a foreign statement's end: 0 in its
   * currency, the home-currency difference to Exchange Gain or Loss.
   */
  currency?: string
  fxRate?: number | null
  homeAmount?: number
  /** On a tax row: the agency's rate, a percent. */
  taxRate?: number
  /** On a tax row: the agency — the key for renaming the line. */
  taxAgencyId?: number
  /** On a transaction row: its receipts, cheques and voice notes. */
  attachments?: Array<{ id: number; kind: AttachmentKind; filename: string }>
}

export type AttachmentKind = 'RECEIPT' | 'CHECK' | 'AUDIO' | 'TEXT' | 'OTHER'

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
}

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
  /** Balance sheet, statement accounts: the dates its books start. More than one = a break. */
  starts?: Array<{ date: string | null }>
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

export type TaxKind = 'SALES' | 'PURCHASE'

export type TaxAgency = {
  id: number
  name: string
  /** At most one per kind, Sales first. `rate` is a percent: 10 = 10%. */
  rates: Array<{ kind: TaxKind; rate: number }>
  active: boolean
}

export type TaxAgencyInput = Omit<TaxAgency, 'id'>

/** The customer's tax agencies. Which ones tax a row is decided per NAME (Names tab). */
export type TaxSettings = {
  agencies: TaxAgency[]
}

export const TAX_KIND_LABEL: Record<TaxKind, string> = {
  SALES: 'Sales',
  PURCHASE: 'Purchase',
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
  /** The agencies that tax this name's rows — none = not taxed (the default). */
  agencyIds: number[]
  /** The descriptions the AI put under this name. */
  descriptions: NameDescription[]
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

export type NameRuleMatch = 'NAME' | 'DESCRIPTION'
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
  rule: NameRuleRef | null
}

export type NamesData = {
  names: LedgerName[]
  unrecognized: UnrecognizedName[]
}

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

/** One description the AI put under a name, with the category its rows mostly have. */
export type NameDescription = { description: string; category: string; rows: number }

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

export async function fetchNames(auth: BookAuth): Promise<NamesData> {
  const res = await bookFetch(auth, '/api/bookkeeping/names')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** Which agencies tax one name — the whole set; [] = not taxed. Applies at once (on read). */
export async function setNameAgencies(
  auth: BookAuth,
  values: { name: string; agencyIds: number[] },
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
  values: NameRuleRef & { name: string | null; category: string | null; scope: EditScope },
): Promise<NamesData> {
  const res = await bookFetch(auth, '/api/bookkeeping/names/rule', json('PUT', values))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
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
  values: { name: string | null; category: string | null; scope: EditScope },
): Promise<void> {
  const res = await bookFetch(auth, `/api/bookkeeping/transactions/${id}`, json('PATCH', values))
  if (!res.ok) throw await errorFrom(res)
}

/** A transaction's whole set of splits: listed ones kept or made, the rest removed (empty = un-split). */
export async function saveSplits(auth: BookAuth, id: number, splits: SplitInput[]): Promise<void> {
  const res = await bookFetch(auth, `/api/bookkeeping/transactions/${id}/splits`, json('PUT', { splits }))
  if (!res.ok) throw await errorFrom(res)
}

/** Name one tax line (an agency's tax on a row); null puts the row's own name back. */
export async function renameTaxLine(auth: BookAuth, id: number, agencyId: number, name: string | null): Promise<void> {
  const res = await bookFetch(
    auth,
    `/api/bookkeeping/transactions/${id}/taxes/${agencyId}`,
    json('PATCH', { name }),
  )
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
