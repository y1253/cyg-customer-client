import { Trash2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FormData, ReconciliationAccount } from '../types';
import { selectItems } from '@/lib/select-items';

// The values are saved as they are; only their labels are translated.
const ACCOUNT_TYPES = ['Checking', 'Savings', 'Credit Card', 'Line of Credit', 'Other'] as const;

interface Props {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export function Step6Reconciliation({ data, onChange }: Props) {
  const { t } = useTranslation(['register', 'common']);
  const accounts = data.reconciliationAccounts;

  function updateAccount(index: number, patch: Partial<ReconciliationAccount>) {
    const updated = accounts.map((a, i) => (i === index ? { ...a, ...patch } : a));
    onChange({ reconciliationAccounts: updated });
  }

  function addAccount() {
    onChange({ reconciliationAccounts: [...accounts, { name: '', type: '', startDate: '', note: '' }] });
  }

  function removeAccount(index: number) {
    onChange({ reconciliationAccounts: accounts.filter((_, i) => i !== index) });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-700">
        <span className="font-medium">{t('reconciliation.cycle')}</span>
        <span className="text-teal-500">·</span>
        <span>{t('reconciliation.cycleHint')}</span>
      </div>

      <div className="flex flex-col gap-4">
        {accounts.map((account, index) => (
          <div key={index} className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {t('reconciliation.account', { n: index + 1 })}
              </span>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeAccount(index)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={t('reconciliation.removeAccount')}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`acct-name-${index}`}>
                  {t('reconciliation.accountName')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`acct-name-${index}`}
                  value={account.name}
                  onChange={e => updateAccount(index, { name: e.target.value })}
                  placeholder={t('reconciliation.accountNamePlaceholder')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`acct-note-${index}`}>
                  {t('schedule.note')} <span className="text-muted-foreground font-normal">{t('schedule.optionalParen')}</span>
                </Label>
                <textarea
                  id={`acct-note-${index}`}
                  value={account.note}
                  onChange={e => updateAccount(index, { note: e.target.value })}
                  placeholder={t('schedule.notePlaceholder')}
                  className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>
                    {t('reconciliation.accountType')} <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    items={selectItems(ACCOUNT_TYPES, v => v, v => t(`reconciliation.types.${v}`))}
                    value={account.type || null}
                    onValueChange={val => updateAccount(index, { type: val ?? '' })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('reconciliation.selectType')} />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map(v => (
                        <SelectItem key={v} value={v}>
                          {t(`reconciliation.types.${v}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`acct-date-${index}`}>
                    {t('schedule.startDate')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`acct-date-${index}`}
                    type="date"
                    value={account.startDate}
                    onChange={e => updateAccount(index, { startDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addAccount} className="w-full gap-1.5">
        <Plus size={15} />
        {t('reconciliation.addAccount')}
      </Button>
    </div>
  );
}
