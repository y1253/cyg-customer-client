import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CONTAINS_MIN as MIN_CHARS, ruleConflictOf, type ContainsRule } from '@/api/bookkeeping'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateAccount } from '@/hooks/useCreateAccount'
import { useSaveNameRule } from '@/hooks/useNameRule'
import { useRuleConflict } from '@/hooks/useRuleConflict'
import { NEW_CATEGORY, categoryChoice, choiceReady, resolveChoice } from '@/lib/categoryChoice'
import { CategoryField } from './CategoryField'
import { NamePicker } from './NamePicker'
import { RuleConflictDialog } from './RuleConflictDialog'

/**
 * "Every description that contains …" (step2): a name and/or a category for every
 * transaction whose bank description holds the text, case-insensitive — now and on every
 * statement from now on. A rule for one exact description still wins over it. `rule` =
 * edit that one (its text is what it is saved under, so it stays as it is); null = a new one.
 */
export function ContainsRuleDialog({
  open,
  rule,
  onOpenChange,
}: {
  open: boolean
  rule: ContainsRule | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Always rendered: the popup unmounts once closed (resetting the form), and the fields
            stay until its exit animation ends. */}
        <ContainsRuleForm key={rule?.key ?? 'new'} rule={rule} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function ContainsRuleForm({ rule, onDone }: { rule: ContainsRule | null; onDone: () => void }) {
  const { t } = useTranslation(['names', 'common'])
  const create = useCreateAccount()
  const save = useSaveNameRule()
  const conflict = useRuleConflict()
  const [text, setText] = useState(rule?.text ?? '')
  const [name, setName] = useState(rule?.name ?? '')
  const [choice, setChoice] = useState(categoryChoice(rule?.category ?? null))

  const trimmed = text.trim()
  const hasCategory = choiceReady(choice)
  const tooShort = trimmed.length < MIN_CHARS
  const pending = create.isPending || save.isPending
  const canSave = !tooShort && (!!name.trim() || hasCategory) && !pending
  const error = create.error ?? save.error

  const submit = async () => {
    if (!canSave) return
    const category = hasCategory ? await resolveChoice(choice, create) : null
    if (hasCategory && !category) return
    const named = name.trim() || null
    // step2: text already linked to another name asks first (RuleConflictDialog).
    const run = (replace: boolean) =>
      save.mutate(
        {
          matchType: 'CONTAINS',
          matchKey: rule?.key ?? trimmed,
          name: named,
          category,
          scope: 'ALWAYS',
          replace,
        },
        { onSuccess: onDone, onError: (e) => conflict.offer(e, named ?? '', () => run(true)) },
      )
    run(false)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>{rule ? t('containsDialog.editTitle') : t('containsDialog.newTitle')}</DialogTitle>
        <DialogDescription>{t('containsDialog.text')}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contains-rule-text">{t('containsDialog.containsLabel')}</Label>
        <Input
          id="contains-rule-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!!rule}
          placeholder={t('containsDialog.placeholder')}
          maxLength={191}
          autoFocus={!rule}
        />
        <p className="text-xs text-muted-foreground">
          {rule ? t('containsDialog.editHelp') : t('containsDialog.minHelp', { min: MIN_CHARS })}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contains-rule-name">{t('containsDialog.nameLabel')}</Label>
        <NamePicker id="contains-rule-name" value={name} placeholder={t('containsDialog.namePlaceholder')} onChange={setName} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{name.trim() ? t('containsDialog.categoryOptional') : t('containsDialog.category')}</Label>
        <CategoryField value={choice} onChange={setChoice} />
        <p className="text-xs text-muted-foreground">
          {name.trim()
            ? t('containsDialog.oneCategory', { name: name.trim() })
            : choice.category === NEW_CATEGORY
              ? t('containsDialog.newCategory')
              : t('containsDialog.everyMatching')}
        </p>
      </div>

      {error && !ruleConflictOf(error) && <p className="text-sm text-destructive">{error.message}</p>}
      <RuleConflictDialog conflict={conflict} />

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('common:actions.cancel')}</DialogClose>
        <Button type="submit" disabled={!canSave} className="bg-brand text-white hover:bg-brand/85">
          {pending ? t('common:actions.saving') : t('common:actions.save')}
        </Button>
      </DialogFooter>
    </form>
  )
}
