import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FormData } from '../types';

interface Props {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

/** Canada only. The NEQ is the one legal number the form still asks (step2, 2026-10-15). */
export function Step4Legal({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="neq">
          NEQ <span className="text-destructive">*</span>
        </Label>
        <Input
          id="neq"
          value={data.neq}
          onChange={e => onChange({ neq: e.target.value })}
          placeholder="Numéro d'entreprise du Québec"
        />
      </div>
    </div>
  );
}
