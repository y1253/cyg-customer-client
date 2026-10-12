import { useMemo, useState } from 'react'
import { loadStripe, type Appearance, type Stripe, type StripeElements } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { Check, CreditCard, Loader2, Lock, Plus, Sparkles, Tag, X } from 'lucide-react'
import { money, type Quote, type SavedCard } from '@/api/billing'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useBillingConfig } from '@/hooks/useBillingConfig'
import { usePayAndGenerate } from '@/hooks/usePayAndGenerate'
import { useQuote } from '@/hooks/useQuote'
import { useSavedCards } from '@/hooks/useSavedCards'
import { cardExpiry, cardLabel } from '@/lib/cards'
import { cn } from '@/lib/utils'

/** One Stripe.js load per publishable key, for the life of the page. */
const stripeByKey = new Map<string, Promise<Stripe | null>>()
function stripeFor(key: string) {
  if (!stripeByKey.has(key)) stripeByKey.set(key, loadStripe(key))
  return stripeByKey.get(key)!
}

const APPEARANCE: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#169f96',
    colorText: '#0B1C2C',
    colorDanger: '#dc2626',
    fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
    borderRadius: '10px',
    spacingUnit: '4px',
  },
}

const FONTS = [
  { cssSrc: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap' },
]

const NEW_CARD = 'new'

/**
 * Pay for one Generate. Shows the price (the admin's, from the server), takes a promo code,
 * and charges a saved card or a new one (Stripe saves it for next time). A $0 total — a free
 * promo — hides the card section entirely: no card is ever asked for when nothing is owed.
 */
export function PayDialog({
  open,
  onOpenChange,
  statements,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  statements: number
}) {
  const config = useBillingConfig()
  const key = config.data?.publishableKey ?? null
  const [quote, setQuote] = useState<Quote | null>(null)
  // A fresh price every time it opens: the promo is dropped on close.
  const setOpen = (next: boolean) => {
    if (!next) setQuote(null)
    onOpenChange(next)
  }

  const currency = config.data?.currency ?? 'cad'
  const listPrice = config.data?.priceCents ?? 0
  const amount = quote?.amountCents ?? listPrice
  const stripePromise = useMemo(() => (key ? stripeFor(key) : null), [key])
  const formProps: PayFormProps = {
    statements,
    listPrice,
    currency,
    quote,
    onQuote: setQuote,
    onDone: () => setOpen(false),
    onCancel: () => setOpen(false),
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="gap-3 border-b bg-gradient-to-br from-brand/10 via-white to-white px-6 pt-6 pb-5">
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand text-white shadow-sm shadow-brand/30">
            <Sparkles className="size-5" />
          </span>
          <div className="grid gap-1">
            <DialogTitle className="text-lg font-bold text-[#0B1C2C]">Read your statements</DialogTitle>
            <DialogDescription>
              We read {statements} new statement{statements === 1 ? '' : 's'} and post every transaction to your
              ledger.
            </DialogDescription>
          </div>
        </DialogHeader>

        {config.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        ) : amount > 0 && !stripePromise ? (
          <p role="alert" className="px-6 py-10 text-center text-sm text-destructive">
            Payments are not set up yet — please contact us.
          </p>
        ) : stripePromise ? (
          <Elements
            stripe={stripePromise}
            options={{
              mode: 'payment',
              // Elements needs a chargeable amount even while a free promo hides it.
              amount: Math.max(amount, 50),
              currency,
              setupFutureUsage: 'off_session',
              allowedPaymentMethodTypes: ['card'],
              appearance: APPEARANCE,
              fonts: FONTS,
            }}
          >
            <StripePayForm {...formProps} />
          </Elements>
        ) : (
          <PayForm {...formProps} stripe={null} elements={null} />
        )}
      </DialogContent>
    </Dialog>
  )
}

type PayFormProps = {
  statements: number
  listPrice: number
  currency: string
  quote: Quote | null
  onQuote: (q: Quote | null) => void
  onDone: () => void
  onCancel: () => void
}

/** Inside `<Elements>`: hands Stripe.js and the Payment Element to the form. */
function StripePayForm(props: PayFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  return <PayForm {...props} stripe={stripe} elements={elements} />
}

function PayForm({
  statements,
  listPrice,
  currency,
  quote,
  onQuote,
  onDone,
  onCancel,
  stripe,
  elements,
}: PayFormProps & {
  /** Null without a publishable key — only ever with nothing to charge. */
  stripe: Stripe | null
  elements: StripeElements | null
}) {
  const amount = quote?.amountCents ?? listPrice
  const free = amount === 0
  const cards = useSavedCards()
  const saved = cards.data ?? []
  const [method, setMethod] = useState<string | null>(null)
  const [cardReady, setCardReady] = useState(false)
  const pay = usePayAndGenerate()

  // Until the customer picks, the most recent saved card; none saved = a new card.
  const chosen = method ?? saved[0]?.id ?? NEW_CARD
  const usingNew = chosen === NEW_CARD

  const submit = () =>
    pay.mutate(
      {
        promoCode: quote?.promo?.code,
        paymentMethodId: free || usingNew ? undefined : chosen,
        prepare: async () => {
          if (free) return
          if (!elements) throw new Error('The card form is still loading.')
          const { error } = await elements.submit()
          if (error) throw new Error(error.message ?? 'Check your card details.')
        },
        confirm: async (clientSecret, savedCard) => {
          if (!stripe) throw new Error('The card form is still loading.')
          const result = savedCard
            ? await stripe.handleNextAction({ clientSecret })
            : await stripe.confirmPayment({
                elements: elements!,
                clientSecret,
                redirect: 'if_required',
                confirmParams: { return_url: window.location.href },
              })
          if (result.error) throw new Error(result.error.message ?? 'Your card was declined.')
        },
      },
      { onSuccess: onDone },
    )

  const canPay =
    !pay.isPending && (free || (!usingNew && !!stripe) || (usingNew && !!stripe && !!elements && cardReady))

  return (
    <div className="grid gap-5 px-6 py-5">
      <Summary statements={statements} listPrice={listPrice} currency={currency} quote={quote} />
      <PromoField quote={quote} onQuote={onQuote} disabled={pay.isPending} />

      {!free && (
        <div className="grid gap-2.5">
          <p className="text-sm font-semibold text-[#0B1C2C]">Pay with</p>
          {cards.isLoading ? (
            <div className="h-14 animate-pulse rounded-xl bg-muted" />
          ) : (
            saved.length > 0 && (
              <div className="grid gap-2">
                {saved.map((card) => (
                  <CardOption
                    key={card.id}
                    card={card}
                    selected={chosen === card.id}
                    onSelect={() => setMethod(card.id)}
                  />
                ))}
                <OptionRow selected={usingNew} onSelect={() => setMethod(NEW_CARD)}>
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Plus className="size-4" />
                  </span>
                  <span className="font-medium text-[#0B1C2C]">Use a new card</span>
                </OptionRow>
              </div>
            )
          )}
          {usingNew && !cards.isLoading && (
            <div className={cn('rounded-xl', saved.length > 0 && 'border bg-muted/20 p-3')}>
              <PaymentElement
                onReady={() => setCardReady(true)}
                options={{ layout: 'tabs', fields: { billingDetails: { address: 'auto' } } }}
              />
            </div>
          )}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5 shrink-0" />
            Secured by Stripe. Your card is saved for next time — we never see its number.
          </p>
        </div>
      )}

      {pay.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {pay.error.message}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button variant="outline" className="h-11 rounded-lg sm:flex-1" onClick={onCancel} disabled={pay.isPending}>
          Cancel
        </Button>
        <Button
          className="h-11 gap-2 rounded-lg bg-brand text-white hover:bg-brand/85 sm:flex-[2]"
          disabled={!canPay}
          onClick={submit}
        >
          {pay.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : free ? (
            <Sparkles className="size-4" />
          ) : (
            <Lock className="size-4" />
          )}
          {pay.isPending ? 'Processing…' : free ? 'Generate free' : `Pay ${money(amount, currency)} & generate`}
        </Button>
      </div>
    </div>
  )
}

function Summary({
  statements,
  listPrice,
  currency,
  quote,
}: {
  statements: number
  listPrice: number
  currency: string
  quote: Quote | null
}) {
  const amount = quote?.amountCents ?? listPrice
  const saving = quote?.promo ? listPrice - amount : 0
  return (
    <div className="grid gap-2.5 rounded-xl bg-muted/50 p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">
          Generate · {statements} statement{statements === 1 ? '' : 's'}
        </span>
        <span className={cn('font-medium text-[#0B1C2C]', quote?.promo && 'text-muted-foreground line-through')}>
          {money(listPrice, currency)}
        </span>
      </div>
      {quote?.promo && (
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <Tag className="size-3.5" />
            {quote.promo.code}
          </span>
          <span className="font-medium text-emerald-700">
            {saving >= 0 ? `−${money(saving, currency)}` : `+${money(-saving, currency)}`}
          </span>
        </div>
      )}
      <Separator />
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-[#0B1C2C]">Total</span>
        <span className="text-2xl font-bold tracking-tight text-[#0B1C2C]">
          {amount === 0 ? 'Free' : money(amount, currency)}
        </span>
      </div>
    </div>
  )
}

function promoLabel(promo: NonNullable<Quote['promo']>, currency: string) {
  return promo.kind === 'PERCENT_OFF' ? `${promo.value}% off` : `Special price ${money(promo.value, currency)}`
}

function PromoField({
  quote,
  onQuote,
  disabled,
}: {
  quote: Quote | null
  onQuote: (q: Quote | null) => void
  disabled: boolean
}) {
  const apply = useQuote()
  const [openField, setOpenField] = useState(false)
  const [code, setCode] = useState('')

  if (quote?.promo)
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Check className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-emerald-900">{quote.promo.code} applied</p>
          <p className="text-xs text-emerald-800">{promoLabel(quote.promo, quote.currency)}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Remove promo code"
          disabled={disabled}
          className="text-emerald-800 hover:bg-emerald-100"
          onClick={() => {
            onQuote(null)
            setCode('')
            apply.reset()
          }}
        >
          <X className="size-4" />
        </Button>
      </div>
    )

  if (!openField)
    return (
      <button
        type="button"
        onClick={() => setOpenField(true)}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-brand hover:underline"
      >
        <Tag className="size-3.5" />
        Have a promo code?
      </button>
    )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    apply.mutate(code.trim(), { onSuccess: (q) => onQuote(q) })
  }

  return (
    <form onSubmit={submit} className="grid gap-1.5">
      <div className="flex gap-2">
        <Input
          autoFocus
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            apply.reset()
          }}
          placeholder="Promo code"
          aria-label="Promo code"
          className="h-10 font-mono tracking-wider uppercase"
          disabled={disabled}
        />
        <Button
          type="submit"
          variant="outline"
          className="h-10 px-4"
          disabled={disabled || apply.isPending || !code.trim()}
        >
          {apply.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Apply'}
        </Button>
      </div>
      {apply.error && <p className="text-xs text-destructive">{apply.error.message}</p>}
    </form>
  )
}

function CardOption({ card, selected, onSelect }: { card: SavedCard; selected: boolean; onSelect: () => void }) {
  return (
    <OptionRow selected={selected} onSelect={onSelect}>
      <span className="flex size-9 items-center justify-center rounded-lg bg-[#0B1C2C] text-white">
        <CreditCard className="size-4" />
      </span>
      <span className="grid min-w-0 flex-1">
        <span className="truncate font-medium text-[#0B1C2C]">{cardLabel(card)}</span>
        <span className="text-xs text-muted-foreground">Expires {cardExpiry(card)}</span>
      </span>
    </OptionRow>
  )
}

function OptionRow({
  selected,
  onSelect,
  children,
}: {
  selected: boolean
  onSelect: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left text-sm transition-colors',
        selected ? 'border-brand ring-2 ring-brand/20' : 'hover:border-foreground/20 hover:bg-muted/30',
      )}
    >
      {children}
      <span
        className={cn(
          'ml-auto flex size-5 shrink-0 items-center justify-center rounded-full border',
          selected ? 'border-brand bg-brand text-white' : 'border-muted-foreground/30',
        )}
      >
        {selected && <Check className="size-3" />}
      </span>
    </button>
  )
}
