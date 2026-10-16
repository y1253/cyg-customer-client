import { EMPTY_FORM, type FormData } from './types'

/**
 * The wizard's steps. Every key but `terms` is SAVED to the internal API on Next
 * (`PUT /registrations/:id/steps/:key`); `terms` is the submit.
 *
 * Mirror of `internal/server/src/registrations/registration-steps.ts`: same keys, same
 * order, same required fields. The server re-checks every one, so a rule that exists
 * only here is no rule; one that exists only there is a Next that fails unexplained.
 */
export const SAVED_STEP_KEYS = [
  'location',
  'business',
  'contact',
  'legal',
  'communication',
  'reconciliation',
  'payables',
  'receivables',
  'payroll',
  'general',
  'secretarial',
] as const
export type SavedStepKey = (typeof SAVED_STEP_KEYS)[number]
export type StepKey = SavedStepKey | 'terms'

export interface StepConfig {
  key: StepKey
  label: string
  title: string
  description: string
}

const ALL_STEPS: StepConfig[] = [
  { key: 'location', label: 'Location', title: 'Business Location', description: 'Where is your business based?' },
  { key: 'business', label: 'Business', title: 'Business Information', description: 'Your operating name and what you do.' },
  { key: 'contact', label: 'Contact', title: 'Contact Information', description: 'How we can reach you.' },
  { key: 'legal', label: 'Legal', title: 'Legal Information', description: 'Required for businesses registered in Québec.' },
  { key: 'communication', label: 'Communication', title: 'How We Communicate', description: 'Connect your email so we can work with you, and get your own phone line.' },
  { key: 'reconciliation', label: 'Reconciliation', title: 'Bank Accounts to Reconcile', description: 'Add the accounts you would like us to reconcile. Each will be on a 30-day cycle.' },
  { key: 'payables', label: 'Bills', title: 'Bills (Accounts Payable)', description: 'How should we handle your bills?' },
  { key: 'receivables', label: 'Receivables', title: 'Accounts Receivable', description: 'How should we handle your accounts receivable?' },
  { key: 'payroll', label: 'Payroll', title: 'Payroll Management', description: 'Configure payroll-related services.' },
  { key: 'general', label: 'General', title: 'General Services', description: 'Additional services and document management.' },
  { key: 'secretarial', label: 'Secretarial', title: 'Secretarial Management', description: 'Configure cash flow, credit card, and receipt tracking services.' },
  { key: 'terms', label: 'Terms', title: 'Terms & Conditions', description: 'Review and accept the terms of service.' },
]

/** The steps this business sees. Legal is for Canadian businesses only. */
export function visibleSteps(country: string | null): StepConfig[] {
  return ALL_STEPS.filter((s) => s.key !== 'legal' || country === 'CANADA')
}

export interface StepContext {
  mailboxConnected: boolean
  billingPasswordSaved: boolean
}

const filled = (v: string | null | undefined) => !!v && v.trim() !== ''

/** Can the customer press Next? Same rules as the server's `stepProblem`. */
export function isStepValid(key: StepKey, f: FormData, ctx: StepContext): boolean {
  switch (key) {
    case 'location':
      return f.country !== null
    case 'business':
      return filled(f.businessName) && filled(f.companyActivity)
    case 'contact':
      return filled(f.personalName) && f.privateEmail.includes('@') && filled(f.privatePhone)
    case 'legal':
      return filled(f.neq)
    case 'communication':
      if (ctx.mailboxConnected) return true
      return (
        f.billingEmail.includes('@') && (filled(f.billingPassword) || ctx.billingPasswordSaved)
      )
    case 'reconciliation':
      return (
        f.reconciliationAccounts.length > 0 &&
        f.reconciliationAccounts.every((a) => filled(a.name) && a.type !== '' && a.startDate !== '')
      )
    case 'payables':
      if (f.apManageBills === null) return false
      return !(f.apManageBills === true && f.apStartDate === '')
    case 'receivables':
      return (
        f.arInvoicingEnabled !== null &&
        f.arStatementsEnabled !== null &&
        f.arCollectionEnabled !== null &&
        f.arReportEnabled !== null
      )
    case 'payroll':
      if (f.payrollEnabled === null) return false
      if (f.country === 'CANADA') {
        if (f.payrollTaxEnabled === null) return false
        if (f.payrollTaxEnabled && !f.payrollTaxCadEnabled && !f.payrollTaxQcEnabled) return false
        if (f.payrollYearEndEnabled === null) return false
      }
      return true
    case 'general':
      if (f.country !== 'CANADA') return true
      return f.qcDocsEnabled !== null && f.craDocsEnabled !== null && f.salesTaxEnabled !== null
    case 'secretarial':
      if (f.cashFlowEnabled === null || f.creditCardEnabled === null) return false
      if (f.cashFlowEnabled && f.cashFlowAccounts.some((a) => a.enabled && !a.startDate)) return false
      if (f.creditCardEnabled && f.creditCardAccounts.some((a) => a.enabled && !a.statementDay)) {
        return false
      }
      return f.receiptTrackingEnabled !== null
    case 'terms':
      return (
        filled(f.cardHolderName) &&
        filled(f.cardNumber) &&
        filled(f.cardExpiry) &&
        filled(f.cardCvv) &&
        f.termsAccepted === true
      )
  }
}

const opt = (v: string) => (v.trim() === '' ? undefined : v)

/** A schedule block's fields, only when its question was answered Yes. */
function schedule(f: FormData, p: string, on: boolean | null) {
  if (on !== true) return {}
  const r = f as unknown as Record<string, unknown>
  return {
    [`${p}StartDate`]: opt(r[`${p}StartDate`] as string),
    [`${p}CycleType`]: opt(r[`${p}CycleType`] as string),
    [`${p}Cycle`]: (r[`${p}Cycle`] as number) || undefined,
    [`${p}CycleDay`]: (r[`${p}CycleDay`] as number | null) ?? undefined,
    [`${p}CycleNth`]: (r[`${p}CycleNth`] as number | null) ?? undefined,
    [`${p}Note`]: opt(r[`${p}Note`] as string),
  }
}

/** What one step sends. Empty strings are omitted, and a No drops its schedule. */
export function stepPayload(key: SavedStepKey, f: FormData): Record<string, unknown> {
  switch (key) {
    case 'location':
      return { country: f.country }
    case 'business':
      return { businessName: f.businessName.trim(), companyActivity: f.companyActivity.trim() }
    case 'contact':
      return {
        personalName: f.personalName.trim(),
        privateEmail: f.privateEmail.trim(),
        privatePhone: f.privatePhone.trim(),
      }
    case 'legal':
      return { neq: f.neq.trim() }
    case 'communication':
      return {
        billingEmail: opt(f.billingEmail.trim()),
        billingPassword: opt(f.billingPassword),
      }
    case 'reconciliation':
      return { reconciliationAccounts: f.reconciliationAccounts }
    case 'payables':
      return {
        apManageBills: f.apManageBills,
        ...schedule(f, 'ap', f.apManageBills),
      }
    case 'receivables':
      return {
        arInvoicingEnabled: f.arInvoicingEnabled,
        ...schedule(f, 'arInvoicing', f.arInvoicingEnabled),
        arStatementsEnabled: f.arStatementsEnabled,
        ...schedule(f, 'arStatements', f.arStatementsEnabled),
        arCollectionEnabled: f.arCollectionEnabled,
        ...schedule(f, 'arCollection', f.arCollectionEnabled),
        arReportEnabled: f.arReportEnabled,
        ...schedule(f, 'arReport', f.arReportEnabled),
      }
    case 'payroll': {
      const canada = f.country === 'CANADA'
      return {
        payrollEnabled: f.payrollEnabled,
        ...schedule(f, 'payroll', f.payrollEnabled),
        ...(canada && {
          payrollTaxEnabled: f.payrollTaxEnabled,
          ...(f.payrollTaxEnabled === true && {
            payrollTaxCadEnabled: f.payrollTaxCadEnabled,
            payrollTaxQcEnabled: f.payrollTaxQcEnabled,
            ...schedule(f, 'payrollTax', f.payrollTaxCadEnabled),
            ...schedule(f, 'payrollTaxQc', f.payrollTaxQcEnabled),
          }),
          payrollYearEndEnabled: f.payrollYearEndEnabled,
          ...(f.payrollYearEndEnabled === true && {
            payrollYearEndRl1: f.payrollYearEndRl1,
            payrollYearEndT4: f.payrollYearEndT4,
            payrollYearEndCnesst: f.payrollYearEndCnesst,
          }),
        }),
      }
    }
    case 'general':
      if (f.country !== 'CANADA') return {}
      return {
        qcDocsEnabled: f.qcDocsEnabled,
        ...(f.qcDocsEnabled === true && { qcDocsNote: opt(f.qcDocsNote) }),
        craDocsEnabled: f.craDocsEnabled,
        ...(f.craDocsEnabled === true && { craDocsNote: opt(f.craDocsNote) }),
        salesTaxEnabled: f.salesTaxEnabled,
        ...(f.salesTaxEnabled === true && { salesTaxNote: opt(f.salesTaxNote) }),
      }
    case 'secretarial':
      return {
        cashFlowEnabled: f.cashFlowEnabled,
        ...(f.cashFlowEnabled === true && { cashFlowAccounts: f.cashFlowAccounts }),
        creditCardEnabled: f.creditCardEnabled,
        ...(f.creditCardEnabled === true && { creditCardAccounts: f.creditCardAccounts }),
        receiptTrackingEnabled: f.receiptTrackingEnabled,
        ...schedule(f, 'receiptTracking', f.receiptTrackingEnabled),
      }
  }
}

/**
 * A saved draft back into the form: every step's answers laid over the empty form,
 * so a field the save omitted (an empty string, a No's schedule) gets its default.
 */
export function formFromAnswers(answers: Record<string, Record<string, unknown>>): FormData {
  const out = { ...EMPTY_FORM } as unknown as Record<string, unknown>
  for (const key of SAVED_STEP_KEYS) {
    for (const [field, value] of Object.entries(answers[key] ?? {})) {
      if (value !== undefined && value !== null && field in out) out[field] = value
    }
  }
  return out as unknown as FormData
}
