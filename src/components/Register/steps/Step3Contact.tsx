import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPhone } from '@/lib/utils';
import type { FormData } from '../types';

interface Props {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export function Step3Contact({ data, onChange }: Props) {
  const { t } = useTranslation(['register', 'common']);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="personalName">
          {t('contact.name')} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="personalName"
          value={data.personalName}
          onChange={e => onChange({ personalName: e.target.value })}
          placeholder={t('contact.namePlaceholder')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="privateEmail">
            {t('contact.email')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="privateEmail"
            type="email"
            value={data.privateEmail}
            onChange={e => onChange({ privateEmail: e.target.value })}
            placeholder={t('contact.emailPlaceholder')}
          />
          {data.privateEmail && !data.privateEmail.includes('@') && (
            <p className="text-xs text-destructive">{t('contact.emailInvalid')}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="privatePhone">
            {t('contact.phone')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="privatePhone"
            type="tel"
            value={data.privatePhone}
            onChange={e => onChange({ privatePhone: formatPhone(e.target.value) })}
            placeholder="111-111-1111"
          />
        </div>
      </div>
    </div>
  );
}
