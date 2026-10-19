import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCurrency } from '@/hooks/useCurrency'
import { useSetAccountCurrency } from '@/hooks/useSetAccountCurrency'
import { money } from '@/lib/money'
import { cn } from '@/lib/utils'

/**
 * A statement account's currency as a small chip; clicking it sets the currency for the
 * WHOLE account (every statement in it, now and later). "Use what the statements say"
 * drops the setting. `currency` undefined = its statements disagree.
 */
export function AccountCurrency({ account, currency }: { account: string; currency?: string | null }) {
  const settings = useCurrency()
  const set = useSetAccountCurrency()
  const home = settings.data?.home
  const shown = currency === undefined ? undefined : currency || home
  const foreign = !!shown && !!home && shown !== home
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        title="The currency this account's statements are in — click to change it"
        className={cn(
          'inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors hover:bg-black/10',
          foreign ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground',
        )}
      >
        {set.isPending ? '…' : shown ?? 'Mixed'}
        <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* base-ui throws when a GroupLabel (DropdownMenuLabel) is not inside a Group. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Currency of “{account}”</DropdownMenuLabel>
          {(settings.data?.currencies ?? []).map((c) => (
            <DropdownMenuItem
              key={c}
              onClick={() => set.mutate({ account, currency: c })}
              className={cn(c === shown && 'font-semibold')}
            >
              {c}
              {c === home && <span className="ml-auto text-xs text-muted-foreground">home</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => set.mutate({ account, currency: null })}>
          Use what the statements say
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The amount before conversion, small under the converted one — e.g. "USD 1,234.56". */
export function ForeignAmount({ currency, amount }: { currency?: string; amount?: number }) {
  if (!currency || amount === undefined) return null
  return (
    <span className="mt-0.5 block text-[11px] leading-tight font-normal text-muted-foreground" title="Before conversion">
      <span className="mr-1">{currency}</span>
      {money(amount)}
    </span>
  )
}
