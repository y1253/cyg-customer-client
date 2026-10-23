import { useState, type FormEvent } from 'react'
import { Building2, Check, ChevronDown, Loader2, Pencil, Plus } from 'lucide-react'
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
  const [dialog, setDialog] = useState<'new' | 'rename' | null>(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-10 max-w-full items-center gap-2 rounded-lg bg-white px-3 text-sm font-medium text-[#0B1C2C] ring-1 ring-black/10 transition-colors outline-none hover:bg-[#F6F8FA] focus-visible:ring-2 focus-visible:ring-brand"
          title="Switch company"
        >
          <Building2 className="size-4 shrink-0 text-brand" />
          <span className="truncate">{current.name}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {/* base-ui throws when a GroupLabel (DropdownMenuLabel) is not inside a Group. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>Your companies</DropdownMenuLabel>
            {books.map((b) => (
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
            Rename “{current.name}”
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onClick={() => setDialog('new')}>
            <Plus className="size-4" />
            New company
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
        <DialogTitle>{mode === 'new' ? 'New company' : 'Rename company'}</DialogTitle>
        <DialogDescription>
          {mode === 'new'
            ? 'A separate set of books — its own statements, files, rules and reports.'
            : 'The name shows on this page and heads your reports and exports.'}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-1.5">
        <Label htmlFor="book-name">Company name</Label>
        <Input
          id="book-name"
          autoFocus
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Maple Street Rentals"
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        )}
      </div>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={pending || !name.trim()} className="bg-brand text-white hover:bg-brand/85">
          {pending && <Loader2 className="size-4 animate-spin" />}
          {mode === 'new' ? 'Create' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}
