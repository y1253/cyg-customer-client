import type { Statement } from '@/api/bookkeeping'

/**
 * step8: what a statement we could not read MEANS and what the customer can do — shown
 * under "Details" next to the exact reason (`error`) and the checks that failed (`checks`).
 */
export function statementHelp(s: Pick<Statement, 'status' | 'error'>): { what: string; todo: string[] } | null {
  if (s.status === 'NEEDS_REVIEW')
    return {
      what:
        "We read every transaction, then added them up and compared them with the totals the bank prints on the statement. They don't match, so something was read wrong or skipped (often a page, a sign, or one amount). To keep your books right, nothing from this statement is in your ledger yet.",
      todo: [
        'Try again — each read starts fresh and often fixes it.',
        'Ask AI and tell it what is wrong (e.g. which page or which amount); it fixes how the statement is read and tries again.',
        'If the PDF is a scan or a photo, upload a clearer copy, or the one downloaded from your bank.',
      ],
    }
  if (s.status !== 'FAILED') return null
  const reason = s.error ?? ''
  if (/password/i.test(reason))
    return {
      what: 'The PDF is locked with a password, so it cannot be opened.',
      todo: ['Download the statement again from your bank without a password, or print it to a new PDF, and upload that.'],
    }
  if (/not look like a bank|credit-card statement/i.test(reason))
    return {
      what: "This file doesn't look like a bank or credit-card statement (it may be a receipt, an invoice or a summary).",
      todo: [
        'If it is a receipt or invoice, upload it under Attachments instead.',
        'If it really is a statement, Ask AI and tell it which bank and account it is.',
      ],
    }
  if (/could not be opened|no pages/i.test(reason))
    return {
      what: 'The file is damaged or is not a real PDF, so it cannot be opened.',
      todo: ['Download the statement again from your bank and upload the new copy.'],
    }
  return {
    what: 'Something went wrong while reading this statement — usually a busy moment on our side or a hard-to-read file.',
    todo: [
      'Try again.',
      'Ask AI and tell it what the statement is; it tries again with that.',
      'If it keeps failing, upload a clearer copy, or the one downloaded from your bank.',
    ],
  }
}
