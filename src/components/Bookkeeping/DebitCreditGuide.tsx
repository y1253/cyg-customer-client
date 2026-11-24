import { Trans, useTranslation } from 'react-i18next'

/**
 * The firm's double-entry cheat sheet (the right-hand table of their bookkeeping sheet):
 * which side increases and which decreases each kind of account.
 */
const RULES = [
  { type: 'asset', increase: 'debit', decrease: 'credit' },
  { type: 'liability', increase: 'credit', decrease: 'debit' },
  { type: 'equity', increase: 'credit', decrease: 'debit' },
  { type: 'expense', increase: 'debit', decrease: 'credit' },
  { type: 'income', increase: 'credit', decrease: 'debit' },
] as const

export function DebitCreditGuide() {
  const { t } = useTranslation('ledger')
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h3 className="font-semibold text-[#0B1C2C]">{t('guide.title')}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        <Trans t={t} i18nKey="guide.text" components={{ b: <b className="text-foreground" /> }} />
      </p>
      <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-black/5">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">{t('guide.account')}</th>
              <th className="px-3 py-2 font-medium">{t('guide.increase')}</th>
              <th className="px-3 py-2 font-medium">{t('guide.decrease')}</th>
            </tr>
          </thead>
          <tbody>
            {RULES.map((r) => (
              <tr key={r.type} className="border-t">
                <td className="px-3 py-2">
                  <span className="font-medium text-[#0B1C2C]">{t(`guide.types.${r.type}`)}</span>
                  <span className="hidden text-muted-foreground sm:inline"> · {t(`guide.examples.${r.type}`)}</span>
                </td>
                <td className="px-3 py-2 text-brand">{t(`columns.${r.increase}`)}</td>
                <td className="px-3 py-2 text-muted-foreground">{t(`columns.${r.decrease}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
