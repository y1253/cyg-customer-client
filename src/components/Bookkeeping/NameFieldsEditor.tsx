import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { NameField, NameFieldKind } from '@/api/bookkeeping'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FIELD_KIND_ICON, FIELD_KINDS, fieldHref, fieldKindLabel, fieldPlaceholder } from '@/lib/name-fields'
import { cn } from '@/lib/utils'

type Draft = { index: number | null; kind: NameFieldKind; label: string; value: string }

/**
 * step2 (2026-11-09): a name's own profile — any fields the customer wants (phone, email,
 * address, website, a note, or one they label themselves). `onChange` gets the whole list:
 * the dialogs save it at once for a name that exists, or hold it until a new name is saved.
 */
export function NameFieldsEditor({
  fields,
  onChange,
  pending,
  error,
}: {
  fields: NameField[]
  onChange: (fields: NameField[]) => unknown
  pending?: boolean
  error?: Error | null
}) {
  const { t } = useTranslation(['names', 'common'])
  const [draft, setDraft] = useState<Draft | null>(null)

  const save = async () => {
    if (!draft || !draft.value.trim()) return
    const field: NameField = { kind: draft.kind, label: draft.label.trim(), value: draft.value.trim() }
    const next = draft.index === null ? [...fields, field] : fields.map((f, i) => (i === draft.index ? field : f))
    try {
      await onChange(next)
      setDraft(null)
    } catch {
      // The error shows below; the form stays open to fix it.
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label>{t('fields.label')}</Label>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => setDraft({ index: null, kind: 'PHONE', label: '', value: '' })}
        >
          <Plus className="size-3.5" /> {t('fields.add')}
        </Button>
      </div>
      {fields.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg bg-muted/40 p-2 text-sm">
          {fields.map((f, i) => {
            const Icon = FIELD_KIND_ICON[f.kind]
            const href = fieldHref(f)
            return (
              <li key={`${i}:${f.kind}:${f.value}`} className="flex min-w-0 items-center gap-2 px-1 py-0.5">
                <Icon className="size-3.5 shrink-0 text-brand" />
                <span className="w-20 shrink-0 truncate text-xs text-muted-foreground">
                  {f.label || fieldKindLabel(f.kind)}
                </span>
                {href ? (
                  <a
                    href={href}
                    target={f.kind === 'WEBSITE' ? '_blank' : undefined}
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate text-[#0B1C2C] hover:text-brand hover:underline"
                    title={f.value}
                  >
                    {f.value}
                  </a>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-[#0B1C2C]" title={f.value}>
                    {f.value}
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title={t('common:actions.edit')}
                  onClick={() => setDraft({ index: i, ...f })}
                >
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title={t('common:actions.remove')}
                  disabled={pending}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => void Promise.resolve(onChange(fields.filter((_, j) => j !== i))).catch(() => {})}
                >
                  <Trash2 />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
      {!fields.length && !draft && (
        <p className="text-xs text-muted-foreground">{t('fields.empty')}</p>
      )}
      {draft && (
        <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-2.5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[8rem_1fr]">
            <Select value={draft.kind} onValueChange={(v) => v && setDraft({ ...draft, kind: v as NameFieldKind })}>
              <SelectTrigger className="w-full">
                <SelectValue>{(v: NameFieldKind) => fieldKindLabel(v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FIELD_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {fieldKindLabel(k)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              aria-label={t('fields.labelAria')}
              value={draft.label}
              maxLength={64}
              placeholder={t(
                draft.kind === 'TEXT' ? 'fields.labelText' : draft.kind === 'PHONE' ? 'fields.labelPhone' : 'fields.labelOther',
              )}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
          </div>
          <div className="flex gap-1.5">
            <Input
              autoFocus
              aria-label={t('fields.valueAria')}
              value={draft.value}
              maxLength={500}
              inputMode={draft.kind === 'PHONE' ? 'tel' : draft.kind === 'EMAIL' ? 'email' : undefined}
              placeholder={fieldPlaceholder(draft.kind)}
              onChange={(e) => setDraft({ ...draft, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void save()
                }
              }}
            />
            <Button type="button" size="icon" title={t('common:actions.save')} disabled={pending || !draft.value.trim()} onClick={() => void save()}>
              <Check />
            </Button>
            <Button type="button" size="icon" variant="ghost" title={t('common:actions.cancel')} onClick={() => setDraft(null)}>
              <X />
            </Button>
          </div>
        </div>
      )}
      {error && <p className={cn('text-xs text-destructive')}>{error.message}</p>}
    </div>
  )
}
