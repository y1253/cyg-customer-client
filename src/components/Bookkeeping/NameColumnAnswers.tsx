import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import type { CustomColumn, CustomNameAnswer, NameAnswerTarget } from '@/api/customColumns'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCustomColumns } from '@/hooks/useCustomColumns'
import { useNames } from '@/hooks/useNames'
import { useSubNames } from '@/hooks/useSplits'
import { byLabel } from '@/lib/sort'
import { CustomCell } from './CustomCell'

/** The default answer of `target` in `columnId`, if it has one. */
function defaultOf(answers: CustomNameAnswer[], columnId: number, target: NameAnswerTarget) {
  return answers.find(
    (a) =>
      a.columnId === columnId &&
      (target.subNameId !== undefined
        ? a.subNameId === target.subNameId
        : a.subNameId === null && a.name?.toLowerCase() === target.name.toLowerCase()),
  )
}

/**
 * step9 (2026-11-19): one column's "Answers per name" — every name of the book (a name with sub-names lists its
 * sub-names instead: it is only their wrapper), each with its DEFAULT answer, typed like a ledger cell. A default
 * fills every EMPTY cell of that name's rows at once and as new rows come in; answers already there stay.
 */
export function ColumnNameAnswers({ column }: { column: CustomColumn }) {
  const { t } = useTranslation(['names', 'common'])
  const columns = useCustomColumns()
  const names = useNames()
  const subNames = useSubNames()
  const [q, setQ] = useState('')
  const answers = columns.data?.nameAnswers ?? []
  const rows = useMemo(() => {
    const subsOf = new Map<string, { id: number; name: string }[]>()
    for (const s of subNames.data ?? []) {
      const k = s.parent.toLowerCase()
      subsOf.set(k, [...(subsOf.get(k) ?? []), { id: s.id, name: s.name }])
    }
    return (names.data?.names ?? [])
      .filter((n) => !n.unclarified)
      .flatMap((n) => {
        const subs = subsOf.get(n.name.toLowerCase())
        return subs?.length
          ? subs.map((s) => ({ key: `s${s.id}`, label: s.name, target: { subNameId: s.id } as NameAnswerTarget }))
          : [{ key: `n${n.name}`, label: n.name, target: { name: n.name } as NameAnswerTarget }]
      })
      .sort((a, b) => byLabel(a.label, b.label))
  }, [names.data, subNames.data])
  const query = q.trim().toLowerCase()
  const shown = query ? rows.filter((r) => r.label.toLowerCase().includes(query)) : rows
  const set = rows.filter((r) => defaultOf(answers, column.id, r.target)).length

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <Label>{t('columnAnswers.title')}</Label>
        <span className="text-xs text-muted-foreground">
          {t('columnAnswers.help', { column: column.name })}
          {set > 0 && ` ${t('columnAnswers.set', { count: set })}`}
        </span>
      </div>
      {rows.length > 8 && (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('columnAnswers.find')} className="h-9 pl-8" />
        </div>
      )}
      <ul className="max-h-80 min-w-0 divide-y overflow-y-auto rounded-lg ring-1 ring-black/10">
        {shown.map((r) => (
          <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,11rem)] items-center gap-2 px-3 py-1.5">
            <span className="truncate text-sm" title={r.label}>
              {r.label}
            </span>
            <CustomCell
              column={column}
              answer={defaultOf(answers, column.id, r.target)}
              nameTarget={r.target}
              emptyLabel={t('columnAnswers.noDefault')}
            />
          </li>
        ))}
        {!shown.length && (
          <li className="px-3 py-2 text-sm text-muted-foreground">{rows.length ? t('columnAnswers.noMatch') : t('columnAnswers.noNames')}</li>
        )}
      </ul>
    </div>
  )
}

/**
 * step9 (2026-11-19): inside a name's / sub-name's Edit window — its default answer in each of the book's own
 * columns (the same as "Answers per name" in the column's window).
 */
export function NameColumnAnswersSection({ target }: { target: NameAnswerTarget }) {
  const { t } = useTranslation(['names', 'common'])
  const columns = useCustomColumns()
  const list = columns.data?.columns ?? []
  if (!list.length) return null
  const answers = columns.data?.nameAnswers ?? []
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-col gap-0.5">
        <Label>{t('columnAnswers.yourColumns')}</Label>
        <span className="text-xs text-muted-foreground">
          {t('columnAnswers.sectionHelp')}
        </span>
      </div>
      <ul className="flex min-w-0 flex-col gap-1">
        {list.map((c) => (
          <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,11rem)] items-center gap-2">
            <span className="truncate text-sm" title={c.name}>
              {c.name}
            </span>
            <CustomCell column={c} answer={defaultOf(answers, c.id, target)} nameTarget={target} emptyLabel={t('columnAnswers.noDefault')} />
          </li>
        ))}
      </ul>
    </div>
  )
}
