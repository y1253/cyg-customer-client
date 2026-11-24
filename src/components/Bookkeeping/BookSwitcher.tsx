import { useState, type FormEvent } from 'react'
import { Building2, Check, ChevronDown, Loader2, Pencil, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Book } from '@/api/books'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateBook, useRenameBook } from '@/hooks/useBooks'
import { sortByLabel } from '@/lib/sort'
import { cn } from '@/lib/utils'

/**
 * step12c: which bookkeeping company the page shows. Every statement, file, rule and report
 * belongs to one; the customer renames them and adds more here.
 */
export function BookSwitcher({
  books,
  current,
  onSelect,
}: {
  books: Book[]
  current: Book
  onSelect: (id: number) => void
}) {
  const { t } = useTranslation(['books', 'common'])
  const [dialog, setDialog] = useState<'new' | 'rename' | null>(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-10 max-w-full items-center gap-2 rounded-lg bg-white px-3 text-sm font-medium text-[#0B1C2C] ring-1 ring-black/10 transition-colors outline-none hover:bg-[#F6F8FA] focus-visible:ring-2 focus-visible:ring-brand"
          title={t('switcher.switch')}
        >
          <Building2 className="size-4 shrink-0 text-brand" />
          <span className="truncate">{current.name}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {/* base-ui throws when a GroupLabel (DropdownMenuLabel) is not inside a Group. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t('switcher.yours')}</DropdownMenuLabel>
            {sortByLabel(books, (b) => b.name).map((b) => (
              <DropdownMenuItem
                key={b.id}
                onClick={() => onSelect(b.id)}
                className={cn('gap-2', b.id === current.id && 'font-semibold')}
              >
                <Check className={cn('size-4', b.id === current.id ? 'opacity-100' : 'opacity-0')} />
                <span className="truncate">{b.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2" onClick={() => setDialog('rename')}>
            <Pencil className="size-4" />
            {t('switcher.rename', { name: current.name })}
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onClick={() => setDialog('new')}>
            <Plus className="size-4" />
            {t('switcher.new')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          {dialog && (
            <NameForm
              key={dialog}
              mode={dialog}
              current={current}
              onDone={(book) => {
                setDialog(null)
                if (dialog === 'new') onSelect(book.id)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function NameForm({
  mode,
  current,
  onDone,
}: {
  mode: 'new' | 'rename'
  current: Book
  onDone: (book: Book) => void
}) {
  const { t } = useTranslation(['books', 'common'])
  const create = useCreateBook()
  const rename = useRenameBook()
  const [name, setName] = useState(mode === 'rename' ? current.name : '')
  const pending = create.isPending || rename.isPending
  const error = create.error ?? rename.error

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) return
    if (mode === 'new') create.mutate(clean, { onSuccess: onDone })
    else rename.mutate({ id: current.id, name: clean }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={submit} className="contents">
      <DialogHeader>
        <DialogTitle>{mode === 'new' ? t('switcher.new') : t('switcher.renameTitle')}</DialogTitle>
        <DialogDescription>
          {mode === 'new'
            ? t('switcher.newHint')
            : t('switcher.renameHint')}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-1.5">
        <Label htmlFor="book-name">{t('switcher.nameLabel')}</Label>
        <Input
          id="book-name"
          autoFocus
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('switcher.namePlaceholder')}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        )}
      </div>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('common:actions.cancel')}</DialogClose>
        <Button type="submit" disabled={pending || !name.trim()} className="bg-brand text-white hover:bg-brand/85">
          {pending && <Loader2 className="size-4 animate-spin" />}
          {mode === 'new' ? t('switcher.create') : t('common:actions.save')}
        </Button>
      </DialogFooter>
    </form>
  )
}
