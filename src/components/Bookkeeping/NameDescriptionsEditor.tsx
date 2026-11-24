import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Check, ListFilter, Pencil, Plus, Trash2, X } from 'lucide-react'
import { CONTAINS_MIN, ruleConflictOf, type NameDescription } from '@/api/bookkeeping'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNameAgencies } from '@/hooks/useNameAgencies'
import { useNameFields } from '@/hooks/useNameFields'
import { useSetNameGroup } from '@/hooks/useNameGroups'
import { useResetNameRule, useSaveNameRule } from '@/hooks/useNameRule'
import { useNames } from '@/hooks/useNames'
import { useRuleConflict } from '@/hooks/useRuleConflict'
import { currentLocale } from '@/i18n'
import { useTax } from '@/hooks/useTax'
import { AgencyPicker } from './AgencyPicker'
import { ExceptionList } from './Exceptions'
import { GroupPicker } from './GroupPicker'
import { NameColumnAnswersSection } from './NameColumnAnswers'
import { NameFieldsEditor } from './NameFieldsEditor'
import { RuleConflictDialog } from './RuleConflictDialog'

/**
 * step9: inside a name's Edit dialog — the bank descriptions this name follows, and its
 * group. Each description shows the rule that ties it here (an exact description, or
 * "contains …"); the customer can NARROW one to a few of its words (a contains rule for this
 * name, which then also catches the variants), change or remove a contains rule, or add one.
 * Every change is saved at once (the Save button below is for the name and category).
 * Reads the name live, so the list follows each change. step2 (2026-11-09): also its
 * profile fields (phone, email, …), a new group typed right here, and — `withTax`, from a
 * ledger row — its split rules.
 */
export function NameDescriptionsEditor({ name, withTax = false }: { name: string; withTax?: boolean }) {
  const { t } = useTranslation(['names', 'common'])
  const names = useNames()
  const live = names.data?.names.find((n) => n.name.toLowerCase() === name.toLowerCase())
  const save = useSaveNameRule()
  const reset = useResetNameRule()
  const setGroup = useSetNameGroup()
  const setFields = useNameFields()
  const setTax = useNameAgencies()
  const tax = useTax()
  const conflict = useRuleConflict()
  const [narrowing, setNarrowing] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [adding, setAdding] = useState(false)
  if (!live) return null
  const busy = save.isPending || reset.isPending
  const error = save.error ?? reset.error ?? setGroup.error ?? setTax.error
  const agencies = tax.data?.agencies ?? []

  /**
   * Save `value` as this name's contains rule — replacing `old` (an exact or older contains
   * rule). The new rule is saved FIRST: when its text is linked to another name the
   * customer is asked (RuleConflictDialog) and, on Cancel, `old` is still there. Removing
   * `old` afterwards re-files its rows through the rules left, the new one included.
   */
  const saveContains = async (
    value: string,
    old?: { matchType: 'DESCRIPTION' | 'CONTAINS'; matchKey: string },
    replace = false,
  ) => {
    const trimmed = value.trim()
    if (trimmed.length < CONTAINS_MIN) return
    try {
      await save.mutateAsync({ matchType: 'CONTAINS', matchKey: trimmed, name: live.name, category: null, scope: 'ALWAYS', replace })
    } catch (e) {
      conflict.offer(e, live.name, () => void saveContains(value, old, true))
      return
    }
    if (old && !(old.matchType === 'CONTAINS' && old.matchKey === trimmed.toLowerCase())) await reset.mutateAsync(old)
    setNarrowing(null)
    setAdding(false)
    setText('')
  }

  const startNarrow = (id: string, value: string) => {
    setAdding(false)
    setNarrowing(id)
    setText(value)
  }

  const editor = (onSave: () => void) => (
    <div className="mt-1 flex flex-col gap-1">
      <div className="flex gap-1.5">
        <Input
          aria-label={t('editor.containsAria')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={191}
          autoFocus
          className="h-8"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSave()
            }
          }}
        />
        <Button type="button" size="icon-sm" disabled={busy || text.trim().length < CONTAINS_MIN} onClick={onSave} title={t('common:actions.save')}>
          <Check />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          title={t('common:actions.cancel')}
          onClick={() => {
            setNarrowing(null)
            setAdding(false)
          }}
        >
          <X />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('editor.narrowHelp', { name: live.name, min: CONTAINS_MIN })}
      </p>
    </div>
  )

  const groups = names.data?.groups ?? []
  return (
    <div className="flex flex-col gap-3">
      {groups.length > 0 && !live.unclarified && (
        <div className="flex flex-col gap-1.5">
          <Label>{t('editor.group')}</Label>
          <GroupPicker
            groups={groups}
            value={live.group ?? live.type}
            disabled={setGroup.isPending}
            onChange={(v) => v !== (live.group ?? live.type) && setGroup.mutate({ name: live.name, group: v })}
          />
          <p className="text-xs text-muted-foreground">
            {t('editor.groupHelp')}
          </p>
        </div>
      )}

      {withTax && !live.unclarified && agencies.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <Label>{t('editor.splitRules')}</Label>
            <span className="text-xs text-muted-foreground">{t('editor.splitRulesHelp', { name: live.name })}</span>
          </div>
          <AgencyPicker
            name={live.name}
            agencies={agencies}
            picked={live.agencyIds}
            alone={live.agencyAlone}
            rows={live.rows}
            pending={setTax.isPending}
            onChange={(agencyIds, alone) => setTax.mutate({ name: live.name, agencyIds, alone })}
          />
        </div>
      )}

      {!live.unclarified && (
        <NameFieldsEditor
          fields={live.fields ?? []}
          pending={setFields.isPending}
          error={setFields.error}
          onChange={(fields) => setFields.mutateAsync({ name: live.name, fields })}
        />
      )}

      {!live.unclarified && <NameColumnAnswersSection target={{ name: live.name }} />}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label>{t('editor.follows')}</Label>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              setNarrowing(null)
              setAdding(true)
              setText('')
            }}
          >
            <Plus className="size-3.5" /> {t('common:actions.add')}
          </Button>
        </div>
        <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto rounded-lg bg-muted/40 p-2 text-sm">
          {(live.followsContains ?? []).map((c) => (
            <li key={`c:${c.key}`} className="px-1 py-0.5">
              <div className="flex items-center gap-2">
                <ListFilter className="size-3.5 shrink-0 text-brand" />
                <span className="min-w-0 flex-1 truncate">
                  <Trans
                    t={t}
                    i18nKey="editor.contains"
                    values={{ text: c.text }}
                    components={{ b: <span className="font-medium" /> }}
                  />
                </span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {t('rows', { count: c.rows, n: c.rows.toLocaleString(currentLocale()) })}
                </span>
                <Button type="button" variant="ghost" size="icon-xs" title={t('editor.changeWords')} onClick={() => startNarrow(`c:${c.key}`, c.text)}>
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title={t('editor.removeRule')}
                  disabled={busy}
                  onClick={() => reset.mutate({ matchType: 'CONTAINS', matchKey: c.key })}
                >
                  <Trash2 />
                </Button>
              </div>
              {narrowing === `c:${c.key}` && editor(() => void saveContains(text, { matchType: 'CONTAINS', matchKey: c.key }))}
            </li>
          ))}
          {live.descriptions.map((d: NameDescription) => {
            const id = `d:${d.key ?? d.description}`
            return (
              <li key={id} className="px-1 py-0.5">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate" title={d.description}>
                    {d.description}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {d.rule?.matchType === 'DESCRIPTION'
                      ? t('editor.thisDescription')
                      : d.rule?.matchType === 'CONTAINS'
                        ? t('contains', { text: d.rule.text })
                        : t('editor.readByAi')}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    title={t('editor.narrow')}
                    onClick={() => startNarrow(id, d.description)}
                  >
                    <Pencil />
                  </Button>
                  {d.rule?.matchType === 'DESCRIPTION' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      title={t('editor.stopFollowing')}
                      disabled={busy}
                      onClick={() => reset.mutate({ matchType: 'DESCRIPTION', matchKey: d.rule!.matchKey })}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
                {/* step12 (2026-11-20): its rows changed one time, here too. */}
                {!!d.exceptions?.length && <ExceptionList exceptions={d.exceptions} />}
                {narrowing === id &&
                  editor(() =>
                    void saveContains(
                      text,
                      d.rule?.matchType === 'DESCRIPTION' ? { matchType: 'DESCRIPTION', matchKey: d.rule.matchKey } : undefined,
                    ),
                  )}
              </li>
            )
          })}
          {!live.descriptions.length && !(live.followsContains ?? []).length && (
            <li className="px-1 py-0.5 text-muted-foreground">{t('editor.none')}</li>
          )}
        </ul>
        {adding && editor(() => void saveContains(text))}
        <p className="text-xs text-muted-foreground">
          {t('editor.dragHelp')}
        </p>
      </div>
      {error && !ruleConflictOf(error) && <p className="text-sm text-destructive">{error.message}</p>}
      <RuleConflictDialog conflict={conflict} />
    </div>
  )
}
