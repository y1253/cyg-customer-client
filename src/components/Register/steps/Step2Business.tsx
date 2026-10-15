import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { FormData } from '../types';

interface Props {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

/** Only the operating name and what the business does (step2, 2026-10-15). */
export function Step2Business({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="businessName">
          Business operating name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="businessName"
          value={data.businessName}
          onChange={e => onChange({ businessName: e.target.value })}
          placeholder="The name your customers know you by"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="companyActivity">
          Business activity <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="companyActivity"
          value={data.companyActivity}
          onChange={e => onChange({ companyActivity: e.target.value })}
          placeholder="Briefly describe what your business does..."
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  );
}
