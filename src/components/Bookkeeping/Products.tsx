import { useMemo, useState } from 'react'
import { Package, Pencil, RotateCcw, Search } from 'lucide-react'
import type { Product, ProductSource } from '@/api/bookkeeping'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useCreateAccount } from '@/hooks/useCreateAccount'
import { useProducts } from '@/hooks/useProducts'
import { useResetProductRule, useSaveProductRule } from '@/hooks/useProductRule'
import { NEW_CATEGORY, categoryChoice, choiceReady, resolveChoice } from '@/lib/categoryChoice'
import { money } from '@/lib/money'
import { cn } from '@/lib/utils'
import { CategoryField } from './CategoryField'

type Filter = 'ALL' | ProductSource

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'rule', label: 'Your categories' },
  { id: 'memory', label: 'Chosen by AI' },
  { id: 'parent', label: 'From the transaction' },
]

const SOURCE: Record<ProductSource, { label: string; className: string }> = {
  rule: { label: 'Yours', className: 'bg-brand/10 text-brand' },
  memory: { label: 'AI', className: 'bg-sky-100 text-sky-800' },
  parent: { label: 'From transaction', className: 'bg-muted text-muted-foreground' },
}

/**
 * The Products tab: every item read off the customer's receipts, with the category its rows
 * are in. The AI chooses a category the first time any receipt has an item (remembered, so
 * it is never asked again); Edit saves the customer's own category, which wins from then on
 * — their existing rows of that item move at once, and every later receipt follows it.
 */
export function Products() {
  const products = useProducts()
  const reset = useResetProductRule()
  const [editing, setEditing] = useState<Product | null>(null)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const matching = useMemo(
    () =>
      (products.data ?? []).filter(
        (p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
      ),
    [products.data, q],
  )
  const count = (f: Filter) => (f === 'ALL' ? matching.length : matching.filter((p) => p.source === f).length)
  const shown = filter === 'ALL' ? matching : matching.filter((p) => p.source === filter)
  const error = products.error ?? reset.error

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      <div className="border-b px-5 py-4">
        <h2 className="font-semibold text-[#0B1C2C]">Products</h2>
        <p className="text-sm text-muted-foreground">
          Every item on your receipts. Change a category and it is saved to your account — used for these items now
          and on every receipt from now on.
        </p>
      </div>

      <div className="flex flex-col gap-3 border-b px-5 py-3 sm:flex-row sm:items-center">
        <div className="relative w-full shrink-0 sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product or category"
            className="h-9 pl-9"
          />
        </div>
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                filter === f.id
                  ? 'bg-[#0B1C2C] text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              )}
            >
              {f.label} <span className="opacity-70 tabular-nums">{count(f.id)}</span>
            </button>
          ))}
        </div>
      </div>

      {products.isLoading ? (
        <div className="flex flex-col gap-2 p-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : !shown.length ? (
        <div className="px-6 py-14 text-center">
          <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Package className="size-5" />
          </span>
          <p className="font-medium text-[#0B1C2C]">{q || filter !== 'ALL' ? 'Nothing matches' : 'No products yet'}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {q || filter !== 'ALL'
              ? 'Try another search or filter.'
              : 'Products appear here once a receipt’s items are split onto its transaction (Receipts tab).'}
          </p>
        </div>
      ) : (
        <ul className="divide-y">
          {shown.map((p) => (
            <li key={p.itemKey} className="flex items-center gap-4 px-5 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <Package className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[#0B1C2C]">{p.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <Badge className={SOURCE[p.source].className}>{SOURCE[p.source].label}</Badge>
                  <span className="truncate text-sm text-muted-foreground">{p.category}</span>
                  <span className="text-xs text-muted-foreground/80 tabular-nums">
                    · {p.rows.toLocaleString()} row{p.rows === 1 ? '' : 's'} · {money(p.total)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon-sm" title={`Change ${p.name}’s category`} onClick={() => setEditing(p)}>
                  <Pencil />
                </Button>
                {p.source === 'rule' && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title={p.suggested ? `Reset to the AI’s choice (${p.suggested})` : 'Reset to default'}
                    disabled={reset.isPending && reset.variables?.itemKey === p.itemKey}
                    onClick={() => reset.mutate({ itemKey: p.itemKey })}
                    className="text-muted-foreground"
                  >
                    <RotateCcw />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="px-5 pb-4 text-sm text-destructive">{error.message}</p>}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          {editing && <ProductForm key={editing.itemKey} product={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Choose the item's category. Always saved to the account (existing rows + every later receipt). */
function ProductForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const create = useCreateAccount()
  const save = useSaveProductRule()
  const [choice, setChoice] = useState(categoryChoice(product.category))
  const changed =
    choiceReady(choice) &&
    (choice.category === NEW_CATEGORY || choice.category !== product.category || product.source !== 'rule')
  const pending = create.isPending || save.isPending
  const error = create.error ?? save.error

  const submit = async () => {
    if (!changed || pending) return
    const category = await resolveChoice(choice, create)
    if (!category) return
    save.mutate({ itemKey: product.itemKey, category }, { onSuccess: onDone })
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
        <DialogTitle>{product.name}</DialogTitle>
        <DialogDescription>
          {product.rows.toLocaleString()} row{product.rows === 1 ? '' : 's'} on your receipts
          {product.suggested && <> · the AI chose {product.suggested}</>}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label>Category</Label>
        <CategoryField value={choice} onChange={setChoice} />
        <p className="text-xs text-muted-foreground">
          Saved to your account — these rows move now, and this item goes in this category on every receipt from now
          on.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={!changed || pending} className="bg-brand text-white hover:bg-brand/85">
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}
