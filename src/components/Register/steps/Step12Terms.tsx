import { Trans, useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FormData } from '../types';

interface Props {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export function Step12Terms({ data, onChange }: Props) {
  const { t } = useTranslation(['register', 'common']);
  return (
    <div className="flex flex-col gap-6">
      {/* Card on File */}
      <div className="rounded-lg border bg-muted/30 p-4 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold">
            {t('terms.cardOnFile')} <span className="text-destructive">*</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('terms.chargedMonday')}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cardHolderName">{t('terms.cardHolder')}</Label>
          <Input
            id="cardHolderName"
            value={data.cardHolderName}
            onChange={e => onChange({ cardHolderName: e.target.value })}
            placeholder={t('contact.namePlaceholder')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cardNumber">{t('terms.cardNumber')}</Label>
          <Input
            id="cardNumber"
            value={data.cardNumber}
            onChange={e => onChange({ cardNumber: e.target.value })}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cardExpiry">{t('terms.expiry')}</Label>
            <Input
              id="cardExpiry"
              value={data.cardExpiry}
              onChange={e => onChange({ cardExpiry: e.target.value })}
              placeholder={t('terms.expiryPlaceholder')}
              maxLength={5}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cardCvv">{t('terms.cvv')}</Label>
            <Input
              id="cardCvv"
              value={data.cardCvv}
              onChange={e => onChange({ cardCvv: e.target.value })}
              placeholder="123"
              maxLength={4}
            />
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold">{t('terms.pleaseAgree')}</p>

        <div className="rounded-lg border bg-muted/20 p-4 text-xs text-muted-foreground flex flex-col gap-2 leading-relaxed">
          <p>
            <span className="font-medium text-foreground">1.</span> {t('terms.rate')}
          </p>
          <p>
            <span className="font-medium text-foreground">2.</span> {t('terms.advertise')}
          </p>
          <ul className="ml-4 flex flex-col gap-1">
            <li>• {t('terms.adSignature')}</li>
            <li>
              • {t('terms.adCalls')}
            </li>
            <li>• {t('terms.adLogo')}</li>
          </ul>
          <p>
            {t('terms.whiteLabel')}
          </p>
          <p>
            <Trans
              t={t}
              i18nKey="terms.detailed"
              components={{
                link: (
                  <a
                    href="https://docs.google.com/document/d/e/2PACX-1vSM7gM4V1fjBiZVC9ugTyFdYGxIOyDfUdyCZ1Dzrtjg_k8l8KX1pk86Z3BGrnXPaCuh6NORex9m5-z2/pub"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2 hover:opacity-80"
                  />
                ),
              }}
            />
          </p>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={data.termsAccepted === true}
            onChange={e => onChange({ termsAccepted: e.target.checked ? true : null })}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span className="text-sm">{t('terms.iAgree')}</span>
        </label>
      </div>
    </div>
  );
}
