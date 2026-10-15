import { useState, type DragEvent } from 'react'
import type { AccountType } from '@/api/bookkeeping'

export const SECTION_LABEL: Record<AccountType, string> = {
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  EQUITY: 'Equity',
  INCOME: 'Income',
  EXPENSE: 'Expenses',
}
export const ALL: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']
/** A bank / card account is cash or a debt — it can only move within the balance sheet. */
export const SHEET: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY']

/** The drag payload: which account is being moved, and whether it is a statement account. */
const MIME = 'application/x-cyg-account'
type Dragged = { account: string; bank: boolean }

export function dragProps(account: string, bank: boolean) {
  return {
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.setData(MIME, JSON.stringify({ account, bank } satisfies Dragged))
      e.dataTransfer.effectAllowed = 'move'
    },
  }
}

/** Drop-target handlers for a section of `type`; `over` while a dragged account is above it. */
export function useDropTarget(type: AccountType, onMove?: (account: string, type: AccountType) => void) {
  const [over, setOver] = useState(false)
  if (!onMove) return { over: false, props: {} }
  return {
    over,
    props: {
      onDragOver: (e: DragEvent) => {
        if (!e.dataTransfer.types.includes(MIME)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setOver(true)
      },
      onDragLeave: (e: DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false)
      },
      onDrop: (e: DragEvent) => {
        setOver(false)
        const raw = e.dataTransfer.getData(MIME)
        if (!raw) return
        e.preventDefault()
        const d = JSON.parse(raw) as Dragged
        if (d.bank && !SHEET.includes(type)) return
        onMove(d.account, type)
      },
    },
  }
}

