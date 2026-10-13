import { errorFrom, fetchWithAuth, handleUnauthorized } from './client'

/** UPLOADED = not read yet; reading starts when the customer clicks Generate. */
export type StatementStatus = 'UPLOADED' | 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED' | 'NEEDS_REVIEW'

export type Statement = {
  id: number
  filename: string
  sizeBytes: number
  status: StatementStatus
  error: string | null
  accountName: string | null
  bankName: string | null
  /** "Chase 4362 · Sep 2026" — the same label every ledger row of it shows. */
  label: string
  periodStart: string | null
  periodEnd: string | null
  transactionCount: number
  createdAt: string
  processedAt: string | null
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
  kind?: 'opening' | 'tax' | 'split'
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
}

export type ReportLine = { name: string; amount: number }

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
}

/** A report period as YYYY-MM-DD; null on either side = open-ended. */
export type Period = { from: string | null; to: string | null }

/** Server-side ceilings — mirrored so the picker can refuse before uploading. */
export const MAX_STATEMENT_BYTES = 50 * 1024 * 1024
/** Files per request. The client sends batches, so a customer can upload any number. */
export const UPLOAD_BATCH = 10

export function isBusy(s: Statement): boolean {
  return s.status === 'PENDING' || s.status === 'PROCESSING'
}

export async function fetchStatements(token: string): Promise<Statement[]> {
  const res = await fetchWithAuth(token, '/api/bookkeeping/statements')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function fetchTransactions(token: string): Promise<LedgerTransaction[]> {
  const res = await fetchWithAuth(token, '/api/bookkeeping/transactions')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function fetchReports(token: string, period: Period): Promise<Reports> {
  const qs = new URLSearchParams()
  if (period.from) qs.set('from', period.from)
  if (period.to) qs.set('to', period.to)
  const res = await fetchWithAuth(token, `/api/bookkeeping/reports${qs.size ? `?${qs}` : ''}`)
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/**
 * One batch of PDFs. XHR rather than fetch so the upload reports progress — a batch of
 * scanned statements can be tens of megabytes.
 */
export function uploadStatements(
  token: string,
  files: File[],
  onProgress: (fraction: number) => void,
): Promise<Statement[]> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f, f.name))
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/bookkeeping/statements')
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
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

export async function deleteStatement(token: string, id: number): Promise<void> {
  const res = await fetchWithAuth(token, `/api/bookkeeping/statements/${id}`, { method: 'DELETE' })
  if (!res.ok) throw await errorFrom(res)
}

export async function retryStatement(token: string, id: number): Promise<Statement> {
  const res = await fetchWithAuth(token, `/api/bookkeeping/statements/${id}/retry`, {
    method: 'POST',
  })
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
export async function downloadLedger(token: string, format: ExportFormat): Promise<void> {
  const res = await fetchWithAuth(token, `/api/bookkeeping/export?format=${format}`)
  if (!res.ok) throw await errorFrom(res)
  await saveBlob(res, `ledger.${format}`)
}

/** Opens the original uploaded PDF in a new tab (the route needs the Bearer token, so no plain link). */
export async function openOriginal(token: string, id: number): Promise<void> {
  // Open the tab synchronously, inside the click, or popup blockers eat it.
  const tab = window.open('', '_blank')
  const res = await fetchWithAuth(token, `/api/bookkeeping/statements/${id}/file`)
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

export type TaxSettings = {
  enabled: boolean
  /** Agencies or the switch changed since the last tax run — Generate applies them. */
  stale: boolean
  running: boolean
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
  /** Its tax lines are left out of the ledger, reports and downloads. */
  taxExempt: boolean
  /** The descriptions the AI put under this name. */
  descriptions: NameDescription[]
  /** What an edit of this name saves under (a NAME rule with this key). */
  ruleKey: string
  /** The customer's own change behind this row — what "Reset to default" removes. */
  rule: NameRuleRef | null
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

/** Reads every not-yet-read statement and re-applies changed tax settings. */
export async function generate(token: string): Promise<{ queued: number; taxing: boolean }> {
  const res = await fetchWithAuth(token, '/api/bookkeeping/generate', { method: 'POST' })
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function fetchTax(token: string): Promise<TaxSettings> {
  const res = await fetchWithAuth(token, '/api/bookkeeping/tax')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function updateTax(token: string, enabled: boolean): Promise<TaxSettings> {
  const res = await fetchWithAuth(token, '/api/bookkeeping/tax', json('PATCH', { enabled }))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function saveAgency(
  token: string,
  values: Partial<TaxAgencyInput> & { id?: number },
): Promise<TaxAgency> {
  const { id, ...body } = values
  const res = await fetchWithAuth(
    token,
    id ? `/api/bookkeeping/agencies/${id}` : '/api/bookkeeping/agencies',
    json(id ? 'PATCH' : 'POST', body),
  )
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function deleteAgency(token: string, id: number): Promise<void> {
  const res = await fetchWithAuth(token, `/api/bookkeeping/agencies/${id}`, { method: 'DELETE' })
  if (!res.ok) throw await errorFrom(res)
}

export async function fetchNames(token: string): Promise<NamesData> {
  const res = await fetchWithAuth(token, '/api/bookkeeping/names')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

export async function updateName(
  token: string,
  values: { name: string; taxExempt: boolean },
): Promise<NamesData> {
  const res = await fetchWithAuth(token, '/api/bookkeeping/names', json('PATCH', values))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/**
 * Save the customer's own name and/or category. It is applied to their existing rows at
 * once and to every statement they upload from now on; null leaves that value as it is.
 */
export async function saveNameRule(
  token: string,
  values: NameRuleRef & { name: string | null; category: string | null; scope: EditScope },
): Promise<NamesData> {
  const res = await fetchWithAuth(token, '/api/bookkeeping/names/rule', json('PUT', values))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** Drop the customer's own change: the rows go back to the default. */
export async function resetNameRule(token: string, values: NameRuleRef): Promise<NamesData> {
  const res = await fetchWithAuth(token, '/api/bookkeeping/names/rule', json('DELETE', values))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** Change one ledger row's name and/or category — only that row, or always for its payee. */
export async function editTransaction(
  token: string,
  id: number,
  values: { name: string | null; category: string | null; scope: EditScope },
): Promise<void> {
  const res = await fetchWithAuth(token, `/api/bookkeeping/transactions/${id}`, json('PATCH', values))
  if (!res.ok) throw await errorFrom(res)
}

/** A transaction's whole set of splits: listed ones kept or made, the rest removed (empty = un-split). */
export async function saveSplits(token: string, id: number, splits: SplitInput[]): Promise<void> {
  const res = await fetchWithAuth(token, `/api/bookkeeping/transactions/${id}/splits`, json('PUT', { splits }))
  if (!res.ok) throw await errorFrom(res)
}

/** Name one tax line (an agency's tax on a row); null puts the row's own name back. */
export async function renameTaxLine(token: string, id: number, agencyId: number, name: string | null): Promise<void> {
  const res = await fetchWithAuth(
    token,
    `/api/bookkeeping/transactions/${id}/taxes/${agencyId}`,
    json('PATCH', { name }),
  )
  if (!res.ok) throw await errorFrom(res)
}

/** A category of the customer's own, for when nothing in the list fits. */
export async function createAccount(
  token: string,
  values: { name: string; type: AccountType },
): Promise<ChartAccount> {
  const res = await fetchWithAuth(token, '/api/bookkeeping/accounts', json('POST', values))
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** The fixed chart of accounts plus the customer's own — the categories a name can be given. */
export async function fetchAccounts(token: string): Promise<ChartAccount[]> {
  const res = await fetchWithAuth(token, '/api/bookkeeping/accounts')
  if (!res.ok) throw await errorFrom(res)
  return res.json()
}

/** React Query keys — one place, so every invalidation hits what the views read. */
export const STATEMENTS_KEY = ['bookkeeping', 'statements'] as const
export const TRANSACTIONS_KEY = ['bookkeeping', 'transactions'] as const
/** Prefix — the hook appends the period. */
export const REPORTS_KEY = ['bookkeeping', 'reports'] as const
export const TAX_KEY = ['bookkeeping', 'tax'] as const
export const NAMES_KEY = ['bookkeeping', 'names'] as const
export const ACCOUNTS_KEY = ['bookkeeping', 'accounts'] as const
export const ATTACHMENTS_KEY = ['bookkeeping', 'attachments'] as const
export const INTAKE_KEY = ['bookkeeping', 'intake'] as const
