// All copy for the public site, taken verbatim from cygfinance.com (Webflow) so text
// edits never touch layout code. Assets live in public/site/.

export const CONTACT = {
  email: 'office@cygfinance.com',
  phoneLabel: '855-CYG-FINA (855-294-3462)',
  phoneHref: 'tel:18552943462',
}

export const NAV_LINKS = [
  { label: 'What We Do', href: '#what-we-do' },
  { label: 'Services', href: '#services' },
]

export const HERO = {
  title: 'Custom Bookkeeping Solutions Tailored to All Your Needs.',
  body: 'CYG Finance helps business owners like you save time and money on bookkeeping and income taxes. We provide dedicated, customized services so you can focus on growing your business.',
}

export const WHAT_WE_DO = {
  lead: 'Experience professional, data-accurate bookkeeping powered by our expertise in QuickBooks Online.',
  tabs: [
    {
      id: 'bookkeeping',
      title: 'Bookkeeping',
      icon: '/site/tab-bookkeeping.svg',
      photo: '/site/photo-bookkeeping.jpg',
      body: 'Efficient bookkeeping is crucial for business success, providing accurate financial records and enhancing transparency. Tailored bookkeeping services adapt to specific business needs, managing tasks like payroll and expense tracking. By staying on top of finances, businesses can make informed decisions, control cash flow, and plan for growth, ensuring long-term success and stability.',
    },
    {
      id: 'compliance',
      title: 'Legal Compliance',
      icon: '/site/tab-compliance.svg',
      photo: '/site/photo-compliance.jpg',
      body: 'Legal compliance is essential for maintaining the integrity and stability of any business. Adhering to mandatory filings and deadlines, such as payroll tax filings, sales tax filings, and year-end reports, is crucial. These requirements help avoid penalties and foster a trustworthy reputation. Accurate and timely compliance ensures that all financial obligations are met, safeguarding the business from legal pitfalls. Efficient systems for tracking and managing these filings allow organizations to focus on growth without the distraction of regulatory issues.',
    },
    {
      id: 'secretarial',
      title: 'Secretarial Support',
      icon: '/site/tab-secretarial.svg',
      photo: '/site/photo-secretarial.jpg',
      body: 'Secretarial support enhances business efficiency by streamlining tasks like cash flow management, receipt tracking, and credit card management. This helps maintain financial accuracy, control expenses, and optimize spending. Effective collection processes ensure timely payments and improved cash flow. With these supports in place, businesses can focus confidently on their core activities, assured of well-managed administrative functions.',
    },
  ],
}

export const SERVICES: { label: string; icon: string }[] = [
  { label: 'Account Transactions', icon: 'svc-transactions.png' },
  { label: 'Reconciliation', icon: 'svc-reconciliation.png' },
  { label: 'Payroll Reporting', icon: 'svc-doc.svg' },
  { label: 'Account Payable Management', icon: 'svc-payables.png' },
  { label: 'Paying Vendors or Recurring Checks etc.', icon: 'svc-doc.svg' },
  { label: 'Credit Card Management', icon: 'svc-credit-card.png' },
  { label: 'Cash Flow Management', icon: 'svc-cash-flow.png' },
  { label: 'Invoice Processing', icon: 'svc-invoice.png' },
  { label: 'Collection', icon: 'svc-collection.png' },
  { label: 'Multi-Currency Transaction Management', icon: 'svc-multi-currency.png' },
  { label: 'Profitability Analysis', icon: 'svc-profitability.png' },
  { label: 'Creating and Sending Payroll', icon: 'svc-payroll.png' },
  { label: 'Payroll Tax and Deductions Filing', icon: 'svc-payroll-tax.png' },
  { label: 'Payroll Year end work', icon: 'svc-payroll-year-end.png' },
  { label: 'Sales Tax Filing', icon: 'svc-sales-tax.png' },
  { label: 'Compliance Monitoring', icon: 'svc-compliance.png' },
  { label: 'Month-End Closing Procedures', icon: 'svc-month-end.png' },
  { label: 'Bank Account Reconciliation', icon: 'svc-bank-reconciliation.png' },
  { label: 'Budget Preparation', icon: 'svc-budget.png' },
  { label: 'Data Entry', icon: 'svc-data-entry.png' },
].map((s) => ({ ...s, icon: `/site/${s.icon}` }))
