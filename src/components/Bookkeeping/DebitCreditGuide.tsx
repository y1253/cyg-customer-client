/**
 * The firm's double-entry cheat sheet (the right-hand table of their bookkeeping sheet):
 * which side increases and which decreases each kind of account.
 */
const RULES = [
  { type: 'Asset', example: 'your bank account', increase: 'Debit', decrease: 'Credit' },
  { type: 'Liability', example: 'loans, credit cards', increase: 'Credit', decrease: 'Debit' },
  { type: 'Equity', example: "owner's money", increase: 'Credit', decrease: 'Debit' },
  { type: 'Expense', example: 'Office Expense, Rent…', increase: 'Debit', decrease: 'Credit' },
  { type: 'Income', example: 'Sales Income…', increase: 'Credit', decrease: 'Debit' },
]

export function DebitCreditGuide() {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h3 className="font-semibold text-[#0B1C2C]">How debits and credits work</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Money into your bank is a <b className="text-foreground">debit</b> to the bank and a credit to where it came
        from (e.g. Sales Income). Money out is a <b className="text-foreground">credit</b> to the bank and a debit to
        what it paid for (e.g. Walmart → Office Expense).
      </p>
      <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-black/5">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Account</th>
              <th className="px-3 py-2 font-medium">Increase</th>
              <th className="px-3 py-2 font-medium">Decrease</th>
            </tr>
          </thead>
          <tbody>
            {RULES.map((r) => (
              <tr key={r.type} className="border-t">
                <td className="px-3 py-2">
                  <span className="font-medium text-[#0B1C2C]">{r.type}</span>
                  <span className="hidden text-muted-foreground sm:inline"> · {r.example}</span>
                </td>
                <td className="px-3 py-2 text-brand">{r.increase}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.decrease}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
