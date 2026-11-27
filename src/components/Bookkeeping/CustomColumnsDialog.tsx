import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Copy, Pencil, Plus, Trash2, Users, X } from 'lucide-react'
import type { CustomColumn, CustomColumnInput } from '@/api/customColumns'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  useCopyCustomColumns,
  useCustomColumns,
  useDeleteCustomColumn,
  useSaveCustomColumn,
} from '@/hooks/useCustomColumns'
import { ApiError } from '@/api/client'
import {
  CUSTOM_COLUMN_TYPES,
  rulesText,
  storedAnswerProblem,
  TYPE_LABELS,
  type CustomColumnType,
} from '@/lib/custom-columns'
import i18n from '@/i18n'
import { ColumnNameAnswers } from './NameColumnAnswers'

type Draft = Omit<CustomColumnInput, 'minChars' | 'maxChars'> & {
  id?: number
  minChars: string
  maxChars: string
}

const EMPTY: Draft = { name: '', type: 'TEXT', minChars: '', maxChars: '', required: false, options: [] }

const draftOf = (c: CustomColumn): Draft => ({
  id: c.id,
  name: c.name,
  type: c.type,
  minChars: c.minChars?.toString() ?? '',
  maxChars: c.maxChars?.toString() ?? '',
  required: c.required,
  options: c.options.map((o) => ({ id: o.id, label: o.label })),
})

/** The form's own check, before anything is sent (the server's `cleanColumn` says the same). */
function draftProblem(d: Draft): string | null {
  if (!d.name.trim()) return i18n.t('ledger:columnsDialog.needName')
  const min = d.minChars === '' ? null : Number(d.minChars)
  const max = d.maxChars === '' ? null : Number(d.maxChars)
  if (d.type !== 'DROPDOWN') {
    for (const v of [min, max]) {
      if (v !== null && (!Number.isInteger(v) || v < 0 || v > 1000)) return i18n.t('ledger:columnsDialog.charsRange')
    }
    if (min !== null && max !== null && min > max) return i18n.t('ledger:columnsDialog.minOverMax')
  } else {
    const labels = d.options.map((o) => o.label.trim().toLowerCase()).filter(Boolean)
    if (!labels.length) return i18n.t('ledger:columnsDialog.needOption')
    if (new Set(labels).size !== labels.length) return i18n.t('ledger:columnsDialog.optionTwice')
  }
  return null
}

/** step9 part 3: where the dialog opens — its list, the add form ("+"), or one column's form (its header). */
export type ColumnsDialogStart = { add: true } | { editId: number } | null

/** An answer already entered that the new rules would break (the server's 400 says the same). */
type Broken = { transactionId: number; date?: string | null; description?: string; value: string; problem: string }

/** "3 answers already in this column don't fit the new rules." */
function brokenText(n: number): string {
  return i18n.t('ledger:columnsDialog.broken', { count: n })
}

/**
 * step8 (2026-11-11): the customer's own ledger columns for this company ("Business" with
 * 1 / 2 / 3). Add, edit, remove; a column's type and rules (any text, text only, number only,
 * a dropdown list; min / max characters; required). When their other companies have columns,
 * "Same as <company>" copies them (user's request).
 * step9 part 3 (2026-11-15): opened straight on the add form (the ledger's "+") or on one
 * column (its header's "Edit column"); Cancel then closes it. New rules that answers already
 * entered break cannot be saved: the rows to fix are listed (user's decision: block the save).
 * step9 (2026-11-19): each column has "Answers per name" — a default answer per name / sub-name that fills its empty
 * cells; a new column opens on it right after it is added.
 */
export function CustomColumnsDialog({
  open,
  onOpenChange,
  start = null,
  rowLabel,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  start?: ColumnsDialogStart
  /** The ledger's words for a row (date · name), for the list of answers to fix. */
  rowLabel?: (transactionId: number) => string | undefined
}) {
  const { t } = useTranslation(['ledger', 'common'])
  const { data } = useCustomColumns()
  const save = useSaveCustomColumn()
  const remove = useDeleteCustomColumn()
  const copy = useCopyCustomColumns()
  const columns = data?.columns ?? []
  const templates = data?.templates ?? []
  // Opened from the ledger on one form (the ledger mounts it anew each time): start there,
  // and Cancel closes the window.
  const [draft, setDraft] = useState<Draft | null>(() => {
    if (!start) return null
    if ('add' in start) return { ...EMPTY }
    const col = columns.find((c) => c.id === start.editId)
    return col ? draftOf(col) : null
  })
  const [tried, setTried] = useState(false)
  /** step9 (2026-11-19): the column whose "Answers per name" is open. */
  const [namesFor, setNamesFor] = useState<number | null>(null)
  const namesColumn = namesFor !== null ? columns.find((c) => c.id === namesFor) : undefined
  const direct = !!start
  const editing = draft?.id ? columns.find((c) => c.id === draft.id) : undefined
  const broken: Broken[] =
    draft && editing && !draftProblem(draft)
      ? Object.entries(data?.answers ?? {}).flatMap(([tid, cells]) => {
          const a = cells[editing.id]
          if (!a) return []
          const problem = storedAnswerProblem(
            {
              type: draft.type,
              minChars: draft.type === 'DROPDOWN' || draft.minChars === '' ? null : Number(draft.minChars),
              maxChars: draft.type === 'DROPDOWN' || draft.maxChars === '' ? null : Number(draft.maxChars),
              options: draft.type === 'DROPDOWN' ? draft.options.filter((o) => o.label.trim()) : [],
            },
            a,
            new Set(editing.options.map((o) => o.id)),
          )
          return problem ? [{ transactionId: Number(tid), value: a.value ?? '', problem }] : []
        })
      : []
  // The server's list wins when it answered (it also knows each row's date and name).
  const body = save.error instanceof ApiError ? (save.error.body as { problems?: Broken[] } | null) : null
  const refused = Array.isArray(body?.problems) ? body.problems : null
  const toFix = refused ?? broken
  const problem = draft ? (draftProblem(draft) ?? (broken.length ? brokenText(broken.length) : null)) : null
  const closeForm = () => {
    setDraft(null)
    setTried(false)
    if (direct) onOpenChange(false)
  }

  const submit = () => {
    if (!draft) return
    setTried(true)
    if (problem) return
    const before = new Set(columns.map((c) => c.id))
    save.mutate(
      {
        ...draft,
        name: draft.name.trim(),
        minChars: draft.type === 'DROPDOWN' || draft.minChars === '' ? null : Number(draft.minChars),
        maxChars: draft.type === 'DROPDOWN' || draft.maxChars === '' ? null : Number(draft.maxChars),
        options: draft.type === 'DROPDOWN' ? draft.options.filter((o) => o.label.trim()) : [],
      },
      {
        // step9 (2026-11-19): a NEW column goes on to its answers per name.
        onSuccess: (data) => {
          const made = draft.id ? undefined : data.columns.find((c) => !before.has(c.id))
          if (!made) return closeForm()
          setDraft(null)
          setTried(false)
          setNamesFor(made.id)
        },
      },
    )
  }

  const setOption = (i: number, label: string) =>
    setDraft((d) => d && { ...d, options: d.options.map((o, k) => (k === i ? { ...o, label } : o)) })
  const moveOption = (i: number, by: number) =>
    setDraft((d) => {
      if (!d) return d
      const next = [...d.options]
      const j = i + by
      if (j < 0 || j >= next.length) return d
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...d, options: next }
    })

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) {
          setDraft(null)
          setTried(false)
          setNamesFor(null)
        }
      }}
    >
      <DialogContent className="overflow-x-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('table.yourColumns')}</DialogTitle>
          <DialogDescription>{t('columnsDialog.description')}</DialogDescription>
        </DialogHeader>

        {!draft && namesColumn && (
          <div className="flex min-w-0 flex-col gap-3">
            <ColumnNameAnswers column={namesColumn} />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNamesFor(null)
                  if (direct) onOpenChange(false)
                }}
              >
                {t('common:actions.done')}
              </Button>
            </div>
          </div>
        )}

        {!draft && !namesColumn && (
          <div className="flex min-w-0 flex-col gap-3">
            {columns.length === 0 && <p className="text-sm text-muted-foreground">{t('columnsDialog.none')}</p>}
            {columns.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-[#0B1C2C]">
                    <span className="truncate">{c.name}</span>
                    {c.qbo && (
                      <span
                        className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800"
                        title={t('columnsDialog.qboLinked')}
                      >
                        QuickBooks
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {rulesText(c)}
                    {c.type === 'DROPDOWN' && `: ${c.options.map((o) => o.label).join(', ')}`}
                    {c.required && ` · ${t('table.requiredLower')}`}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setNamesFor(c.id)} title={t('columnsDialog.answersPerName')}>
                  <Users className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setDraft(draftOf(c))} title={t('common:actions.edit')}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(c.id)}
                  title={t('columnsDialog.removeColumn')}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button className="gap-1.5 bg-brand text-white hover:bg-brand/85" onClick={() => setDraft({ ...EMPTY })}>
                <Plus className="size-4" /> {t('columnsDialog.addColumn')}
              </Button>
              {templates.map((tpl) => (
                <Button
                  key={tpl.bookId}
                  variant="outline"
                  className="gap-1.5"
                  disabled={copy.isPending}
                  onClick={() => copy.mutate(tpl.bookId)}
                  title={t('columnsDialog.copyTitle', { columns: tpl.columns.map((c) => c.name).join(', ') })}
                >
                  <Copy className="size-4" /> {t('columnsDialog.sameAs', { book: tpl.bookName })}
                </Button>
              ))}
            </div>
            {templates.length > 0 && (
              <p className="text-xs text-muted-foreground">{t('columnsDialog.sameAsHelp')}</p>
            )}
            {(remove.error || copy.error) && (
              <p className="text-sm text-destructive">{(remove.error ?? copy.error)?.message}</p>
            )}
          </div>
        )}

        {draft && (
          <form
            className="flex min-w-0 flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cc-name">{t('columnsDialog.name')}</Label>
              <Input
                id="cc-name"
                autoFocus
                maxLength={64}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder={t('columnsDialog.namePlaceholder')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('columnsDialog.holds')}</Label>
              <Select
                value={draft.type}
                onValueChange={(v) =>
                  v &&
                  setDraft({
                    ...draft,
                    type: v as CustomColumnType,
                    options: v === 'DROPDOWN' && !draft.options.length ? [{ label: '' }] : draft.options,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: CustomColumnType) => TYPE_LABELS[v]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_COLUMN_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {draft.type === 'DROPDOWN' ? (
              <div className="flex flex-col gap-1.5">
                <Label>{t('columnsDialog.options')}</Label>
                {draft.options.map((o, i) => (
                  <div key={o.id ?? `n${i}`} className="flex items-center gap-1">
                    <Input
                      value={o.label}
                      maxLength={120}
                      onChange={(e) => setOption(i, e.target.value)}
                      placeholder={t('columnsDialog.option', { n: i + 1 })}
                      className="h-9"
                    />
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => moveOption(i, -1)} title={t('columnsDialog.up')}>
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => moveOption(i, 1)} title={t('columnsDialog.down')}>
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDraft({ ...draft, options: draft.options.filter((_, k) => k !== i) })}
                      title={t('columnsDialog.removeOption')}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit gap-1.5"
                  onClick={() => setDraft({ ...draft, options: [...draft.options, { label: '' }] })}
                >
                  <Plus className="size-4" /> {t('columnsDialog.addOption')}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cc-min">{t('columnsDialog.minChars')}</Label>
                  <Input
                    id="cc-min"
                    inputMode="numeric"
                    value={draft.minChars}
                    onChange={(e) => setDraft({ ...draft, minChars: e.target.value.replace(/\D/g, '') })}
                    placeholder={t('common:status.none')}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cc-max">{t('columnsDialog.maxChars')}</Label>
                  <Input
                    id="cc-max"
                    inputMode="numeric"
                    value={draft.maxChars}
                    onChange={(e) => setDraft({ ...draft, maxChars: e.target.value.replace(/\D/g, '') })}
                    placeholder={t('common:status.none')}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <Label htmlFor="cc-required">{t('common:status.required')}</Label>
                <span className="text-xs text-muted-foreground">{t('columnsDialog.requiredHelp')}</span>
              </div>
              <Switch
                id="cc-required"
                checked={draft.required}
                onCheckedChange={(v) => setDraft({ ...draft, required: v })}
              />
            </div>
            {toFix.length > 0 && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-600/20">
                <p className="font-medium">
                  {brokenText(toFix.length)} {t('columnsDialog.fixFirst', { count: toFix.length })}
                </p>
                <ul className="mt-1.5 max-h-40 space-y-0.5 overflow-y-auto text-xs">
                  {toFix.slice(0, 50).map((b) => (
                    <li key={b.transactionId} className="flex min-w-0 gap-1.5">
                      <span className="min-w-0 truncate text-red-900/80">
                        {rowLabel?.(b.transactionId) ??
                          ([b.date, b.description].filter(Boolean).join(' · ') || t('columnsDialog.row', { id: b.transactionId }))}
                      </span>
                      <span className="max-w-32 shrink-0 truncate font-medium">{t('columnsDialog.quoted', { value: b.value })}</span>
                      <span className="shrink-0">— {b.problem}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {((tried && problem && !toFix.length) || (save.error && !refused)) && (
              <p className="text-sm text-destructive">{(tried && problem) || save.error?.message}</p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              {editing && (
                <Button
                  type="button"
                  variant="ghost"
                  className="mr-auto gap-1.5"
                  onClick={() => {
                    setDraft(null)
                    setTried(false)
                    setNamesFor(editing.id)
                  }}
                >
                  <Users className="size-4" /> {t('columnsDialog.answersPerName')}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={closeForm}>
                {t('common:actions.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={save.isPending || broken.length > 0}
                className="bg-brand text-white hover:bg-brand/85"
              >
                {draft.id ? t('common:actions.save') : t('columnsDialog.addColumnShort')}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
