import { CreditCard, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRemoveCard } from '@/hooks/useRemoveCard'
import { useSavedCards } from '@/hooks/useSavedCards'
import { cardExpiry, cardLabel } from '@/lib/cards'

/** Account page: the cards Stripe saved from past payments, each removable. */
export function SavedCardsCard() {
  const cards = useSavedCards()
  const remove = useRemoveCard()
  const list = cards.data ?? []

  return (
    <Card className="mt-6 max-w-2xl rounded-2xl border-0 py-8 shadow-sm ring-1 ring-black/5">
      <CardHeader className="px-8">
        <CardTitle className="text-lg font-bold text-[#0B1C2C]">Saved cards</CardTitle>
        <CardDescription>
          Saved securely by Stripe when you pay, so the next Generate is one click. We never see the card number.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 px-8">
        {cards.isLoading ? (
          <div className="h-14 animate-pulse rounded-xl bg-muted" />
        ) : list.length === 0 ? (
          <p className="rounded-xl bg-muted/50 px-4 py-5 text-center text-sm text-muted-foreground">
            No saved cards yet — your card is saved the first time you pay.
          </p>
        ) : (
          list.map((card) => {
            const removing = remove.isPending && remove.variables === card.id
            return (
              <div key={card.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-[#0B1C2C] text-white">
                  <CreditCard className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#0B1C2C]">{cardLabel(card)}</p>
                  <p className="text-xs text-muted-foreground">Expires {cardExpiry(card)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-destructive"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(card.id)}
                >
                  {removing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  Remove
                </Button>
              </div>
            )
          })
        )}
        {(remove.error || cards.error) && (
          <p role="alert" className="text-sm text-destructive">
            {(remove.error ?? cards.error)?.message}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
