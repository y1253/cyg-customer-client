import { useState, type DragEvent } from 'react'

/** step8: the drag payload for a payee name being merged into another (Names tab). */
const MIME = 'application/x-cyg-name'
/** step9: a bank description dragged from one name to another — `{ key, description }`. */
const MIME_DESCRIPTION = 'application/x-cyg-description'

export function nameDragProps(name: string) {
  return {
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.setData(MIME, name)
      e.dataTransfer.effectAllowed = 'move'
    },
  }
}

/** step9: drag one description out of a name's list (its rows go to the name it is dropped on). */
export function descriptionDragProps(key: string, description: string) {
  return {
    draggable: true,
    onDragStart: (e: DragEvent) => {
      // Inside a draggable name row: only the description is dragged.
      e.stopPropagation()
      e.dataTransfer.setData(MIME_DESCRIPTION, JSON.stringify({ key, description }))
      e.dataTransfer.effectAllowed = 'move'
    },
  }
}

/**
 * Drop-target handlers for the name `target`; `over` while another name or a description is
 * above it. A name dropped here merges into it (step8); a description is nested under it
 * (step9). Stops the event so the group section around the row does not take it too.
 */
export function useNameDrop(
  target: string,
  onDrop?: (from: string) => void,
  onDescription?: (d: { key: string; description: string }) => void,
) {
  const [over, setOver] = useState(false)
  if (!onDrop && !onDescription) return { over: false, props: {} }
  const accepts = (e: DragEvent) =>
    (!!onDrop && e.dataTransfer.types.includes(MIME)) ||
    (!!onDescription && e.dataTransfer.types.includes(MIME_DESCRIPTION))
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
        const description = onDescription && e.dataTransfer.getData(MIME_DESCRIPTION)
        if (description) {
          e.preventDefault()
          e.stopPropagation()
          onDescription(JSON.parse(description) as { key: string; description: string })
          return
        }
        const from = onDrop && e.dataTransfer.getData(MIME)
        if (!from) return
        e.preventDefault()
        e.stopPropagation()
        if (from.toLowerCase() !== target.toLowerCase()) onDrop(from)
      },
    },
  }
}

/** step9: a Names-tab group section — a name dropped on it (not on a name) joins the group. */
export function useGroupDrop(onDrop?: (name: string) => void) {
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
        const name = e.dataTransfer.getData(MIME)
        if (!name) return
        e.preventDefault()
        onDrop(name)
      },
    },
  }
}
