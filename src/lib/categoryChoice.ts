import type { AccountType, ChartAccount } from '@/api/bookkeeping'
import type { useCreateAccount } from '@/hooks/useCreateAccount'
import i18n from '@/i18n'

/** The Select's value for "type in a category of my own". Never a real account name. */
export const NEW_CATEGORY = '__new__'

// Getters, so each read is in the language shown now.
export const TYPE_LABEL: Record<AccountType, string> = {
  get INCOME() {
    return i18n.t('common:accountType.INCOME')
  },
  get EXPENSE() {
    return i18n.t('common:accountType.EXPENSE')
  },
  get ASSET() {
    return i18n.t('common:accountType.ASSET')
  },
  get LIABILITY() {
    return i18n.t('common:accountType.LIABILITY')
  },
  get EQUITY() {
    return i18n.t('common:accountType.EQUITY')
  },
}

/** A chosen category — or, with `category === NEW_CATEGORY`, one being typed in with its type. */
export type CategoryChoice = { category: string | null; newName: string; newType: AccountType | null }

export const categoryChoice = (category: string | null): CategoryChoice => ({
  category,
  newName: '',
  newType: 'EXPENSE',
})

/** Is anything usable chosen? A new category needs its name and type. */
export function choiceReady(c: CategoryChoice): boolean {
  return c.category === NEW_CATEGORY ? !!c.newName.trim() && !!c.newType : !!c.category
}

/** The account name to send: a new category is created first. Null when that failed. */
export async function resolveChoice(
  c: CategoryChoice,
  create: ReturnType<typeof useCreateAccount>,
): Promise<string | null> {
  if (c.category !== NEW_CATEGORY) return c.category
  const made: ChartAccount | null = await create
    .mutateAsync({ name: c.newName.trim(), type: c.newType! })
    .catch(() => null)
  return made?.name ?? null
}
