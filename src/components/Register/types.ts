export interface ReconciliationAccount {
  name: string
  type: string
  startDate: string
  note: string
}

export interface CashFlowAccount {
  accountName: string
  enabled: boolean
  note: string
  startDate: string
  cycleType: string
  cycle: number
  cycleDay: number | null
  cycleNth: number | null
}

export interface CreditCardAccount {
  accountName: string
  enabled: boolean
  note: string
  statementDay: number | null
  limitEnabled: boolean
  limitNote: string
  limitAmount: string
  limitCycleDays: number
}

/**
 * Everything the registration wizard holds while it is on screen. Removed with their
 * questions (step2, 2026-10-15): QuickBooks, business type / structure, store phone,
 * Revenue QC ID / CRA BN / fiscal year, accountant, location visit.
 */
export interface FormData {
  country: string | null
  businessName: string
  companyActivity: string
  personalName: string
  privateEmail: string
  privatePhone: string
  neq: string
  billingEmail: string
  billingPassword: string
  reconciliationAccounts: ReconciliationAccount[]
  apManageBills: boolean | null
  apStartDate: string
  apCycleType: string
  apCycle: number
  apCycleDay: number | null
  apCycleNth: number | null
  apNote: string
  arInvoicingEnabled: boolean | null
  arInvoicingStartDate: string
  arInvoicingCycleType: string
  arInvoicingCycle: number
  arInvoicingCycleDay: number | null
  arInvoicingCycleNth: number | null
  arInvoicingNote: string
  arStatementsEnabled: boolean | null
  arStatementsStartDate: string
  arStatementsCycleType: string
  arStatementsCycle: number
  arStatementsCycleDay: number | null
  arStatementsCycleNth: number | null
  arStatementsNote: string
  arCollectionEnabled: boolean | null
  arCollectionStartDate: string
  arCollectionCycleType: string
  arCollectionCycle: number
  arCollectionCycleDay: number | null
  arCollectionCycleNth: number | null
  arCollectionNote: string
  arReportEnabled: boolean | null
  arReportStartDate: string
  arReportCycleType: string
  arReportCycle: number
  arReportCycleDay: number | null
  arReportCycleNth: number | null
  arReportNote: string
  payrollEnabled: boolean | null
  payrollStartDate: string
  payrollCycleType: string
  payrollCycle: number
  payrollCycleDay: number | null
  payrollCycleNth: number | null
  payrollNote: string
  payrollTaxEnabled: boolean | null
  payrollTaxCadEnabled: boolean
  payrollTaxQcEnabled: boolean
  payrollTaxStartDate: string
  payrollTaxCycleType: string
  payrollTaxCycle: number
  payrollTaxCycleDay: number | null
  payrollTaxCycleNth: number | null
  payrollTaxNote: string
  payrollTaxQcStartDate: string
  payrollTaxQcCycleType: string
  payrollTaxQcCycle: number
  payrollTaxQcCycleDay: number | null
  payrollTaxQcCycleNth: number | null
  payrollTaxQcNote: string
  payrollYearEndEnabled: boolean | null
  payrollYearEndRl1: boolean
  payrollYearEndT4: boolean
  payrollYearEndCnesst: boolean
  qcDocsEnabled: boolean | null
  qcDocsNote: string
  craDocsEnabled: boolean | null
  craDocsNote: string
  salesTaxEnabled: boolean | null
  salesTaxNote: string
  cashFlowEnabled: boolean | null
  cashFlowAccounts: CashFlowAccount[]
  creditCardEnabled: boolean | null
  creditCardAccounts: CreditCardAccount[]
  receiptTrackingEnabled: boolean | null
  receiptTrackingStartDate: string
  receiptTrackingCycleType: string
  receiptTrackingCycle: number
  receiptTrackingCycleDay: number | null
  receiptTrackingCycleNth: number | null
  receiptTrackingNote: string
  // Terms — sent with the submit only, never saved in a draft
  cardHolderName: string
  cardNumber: string
  cardExpiry: string
  cardCvv: string
  termsAccepted: boolean | null
}

const schedule = (p: string) => ({
  [`${p}StartDate`]: '',
  [`${p}CycleType`]: 'DAYS',
  [`${p}Cycle`]: 30,
  [`${p}CycleDay`]: null,
  [`${p}CycleNth`]: null,
  [`${p}Note`]: '',
})

export const EMPTY_FORM: FormData = {
  country: null,
  businessName: '',
  companyActivity: '',
  personalName: '',
  privateEmail: '',
  privatePhone: '',
  neq: '',
  billingEmail: '',
  billingPassword: '',
  reconciliationAccounts: [{ name: '', type: '', startDate: '', note: '' }],
  apManageBills: null,
  ...schedule('ap'),
  arInvoicingEnabled: null,
  ...schedule('arInvoicing'),
  arStatementsEnabled: null,
  ...schedule('arStatements'),
  arCollectionEnabled: null,
  ...schedule('arCollection'),
  arReportEnabled: null,
  ...schedule('arReport'),
  payrollEnabled: null,
  ...schedule('payroll'),
  payrollTaxEnabled: null,
  payrollTaxCadEnabled: false,
  payrollTaxQcEnabled: false,
  ...schedule('payrollTax'),
  ...schedule('payrollTaxQc'),
  payrollYearEndEnabled: null,
  payrollYearEndRl1: false,
  payrollYearEndT4: false,
  payrollYearEndCnesst: false,
  qcDocsEnabled: null,
  qcDocsNote: '',
  craDocsEnabled: null,
  craDocsNote: '',
  salesTaxEnabled: null,
  salesTaxNote: '',
  cashFlowEnabled: null,
  cashFlowAccounts: [],
  creditCardEnabled: null,
  creditCardAccounts: [],
  receiptTrackingEnabled: null,
  ...schedule('receiptTracking'),
  cardHolderName: '',
  cardNumber: '',
  cardExpiry: '',
  cardCvv: '',
  termsAccepted: null,
} as unknown as FormData
