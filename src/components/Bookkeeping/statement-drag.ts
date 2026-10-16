import { useState, type DragEvent } from 'react'

/** The drag payload for a statement row being filed into another account folder. */
const MIME = 'application/x-cyg-statement'

export function statementDragProps(id: number) {
  return {
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.setData(MIME, String(id))
      e.dataTransfer.effectAllowed = 'move'
    },
  }
}

/** Drop-target handlers for an account folder; `over` while a statement is above it. */
export function useFolderDrop(onDrop?: (statementId: number) => void) {
  const [over, setOver] = useState(false)
  if (!onDrop) return { over: false, props: {} }
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
        const id = Number(e.dataTransfer.getData(MIME))
        if (!id) return
        e.preventDefault()
        onDrop(id)
      },
    },
  }
}
