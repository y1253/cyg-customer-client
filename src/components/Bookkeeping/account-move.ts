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
/** Set next to MIME on a bank / card (folder) account — `types` is all a dragover can read. */
const MIME_FOLDER = 'application/x-cyg-account-folder'
type Dragged = { account: string; bank: boolean }

export function dragProps(account: string, bank: boolean) {
  return {
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.setData(MIME, JSON.stringify({ account, bank } satisfies Dragged))
      if (bank) e.dataTransfer.setData(MIME_FOLDER, '1')
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

/**
 * step8: drop-target handlers for ONE account row — another account dropped on it is merged
 * into it (`onMerge(from)`, after a confirm). A bank / card account (a Bank feeds folder)
 * only takes another folder account and a category only another category; any other drop
 * falls through to the section, which moves it instead.
 */
export function useAccountDrop(account: string, bank: boolean, onMerge?: (from: string) => void) {
  const [over, setOver] = useState(false)
  if (!onMerge) return { over: false, props: {} }
  const accepts = (e: DragEvent) =>
    e.dataTransfer.types.includes(MIME) && e.dataTransfer.types.includes(MIME_FOLDER) === bank
  return {
    over,
    props: {
      onDragOver: (e: DragEvent) => {
        if (!accepts(e)) return
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
        setOver(true)
      },
      onDragLeave: (e: DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false)
      },
      onDrop: (e: DragEvent) => {
        setOver(false)
        if (!accepts(e)) return
        const raw = e.dataTransfer.getData(MIME)
        if (!raw) return
        const d = JSON.parse(raw) as Dragged
        if (d.account === account) return // dropped on itself: let the section ignore it too
        e.preventDefault()
        e.stopPropagation()
        onMerge(d.account)
      },
    },
  }
}
