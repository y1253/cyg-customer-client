import { useEffect, useRef, useState, type DragEvent } from 'react'

/** step8: the drag payload for a payee name being merged into another (Names tab). */
const MIME = 'application/x-cyg-name'
/** step9: a bank description dragged from one name to another — `{ key, description }`. */
const MIME_DESCRIPTION = 'application/x-cyg-description'
/** step9 (2026-11-17, third request): a sub-name dragged like a name — `{ id, name }`. */
const MIME_SUB_NAME = 'application/x-cyg-subname'

export type DraggedSubName = { id: number; name: string }

/**
 * step9 (2026-11-18): the sub-name being dragged right now — `dataTransfer` can't be read
 * during a drag, and a wrapper row needs to know it is its own sub-name (nothing to merge).
 */
let draggingSub: number | null = null
export const draggedSubId = () => draggingSub

export function nameDragProps(name: string) {
  return {
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.setData(MIME, name)
      e.dataTransfer.effectAllowed = 'move'
    },
  }
}

/** step9 (2026-11-17, third request): drag a sub-name onto a name, a sub-name or a group. */
export function subNameDragProps(sub: DraggedSubName) {
  return {
    draggable: true,
    onDragStart: (e: DragEvent) => {
      // Inside its parent's row: only the sub-name is dragged.
      e.stopPropagation()
      e.dataTransfer.setData(MIME_SUB_NAME, JSON.stringify({ id: sub.id, name: sub.name }))
      e.dataTransfer.effectAllowed = 'move'
      draggingSub = sub.id
    },
    onDragEnd: () => {
      draggingSub = null
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
 * step9 (2026-11-17, third request): a sub-name dropped here merges into it (`onSubName`).
 */
export function useNameDrop(
  target: string,
  onDrop?: (from: string) => void,
  onDescription?: (d: { key: string; description: string }) => void,
  onSubName?: (sub: DraggedSubName) => void,
) {
  const [over, setOver] = useState(false)
  if (!onDrop && !onDescription && !onSubName) return { over: false, props: {} }
  const accepts = (e: DragEvent) =>
    (!!onDrop && e.dataTransfer.types.includes(MIME)) ||
    (!!onDescription && e.dataTransfer.types.includes(MIME_DESCRIPTION)) ||
    (!!onSubName && e.dataTransfer.types.includes(MIME_SUB_NAME))
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
        const sub = onSubName && e.dataTransfer.getData(MIME_SUB_NAME)
        if (sub) {
          e.preventDefault()
          e.stopPropagation()
          onSubName(JSON.parse(sub) as DraggedSubName)
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

/**
 * step9 (2026-11-17): a folded wrapper name's row (a name with sub-names). A name, sub-name or
 * description held over it for a moment unfolds it (`onHoverOpen`), so its sub-names can take
 * the drop. step9 (2026-11-18): only that — the row itself takes a name or a sub-name
 * (`useNameDrop`; it lands on its sub-name of the same category). Join with `joinDragProps`.
 */
export function useHoverOpen(enabled: boolean, onHoverOpen: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clear = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  useEffect(() => clear, [])
  if (!enabled) return { props: {} }
  const held = (e: DragEvent) =>
    [MIME, MIME_SUB_NAME, MIME_DESCRIPTION].some((t) => e.dataTransfer.types.includes(t))
  return {
    props: {
      onDragOver: (e: DragEvent) => {
        if (!held(e) || timer.current) return
        timer.current = setTimeout(() => {
          timer.current = null
          onHoverOpen()
        }, 600)
      },
      onDragLeave: (e: DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) clear()
      },
      onDrop: () => clear(),
    },
  }
}

/**
 * step9 (2026-11-19): a wrapper name's row (a name with sub-names) refuses a sub-name. step9 (2026-11-23): only
 * its OWN sub-name (`only`, checked during the drag) — any other may be merged into it or moved under it. The row
 * shows "no drop" and `over` (for its hint), and stops the event.
 */
export function useRefuseSubName(enabled: boolean, only: () => boolean = () => true) {
  const [over, setOver] = useState(false)
  if (!enabled) return { over: false, props: {} }
  return {
    over,
    props: {
      onDragOver: (e: DragEvent) => {
        if (!e.dataTransfer.types.includes(MIME_SUB_NAME) || !only()) return
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'none'
        setOver(true)
      },
      onDragLeave: (e: DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false)
      },
      onDrop: (e: DragEvent) => {
        setOver(false)
        if (!e.dataTransfer.types.includes(MIME_SUB_NAME) || !only()) return
        e.preventDefault()
        e.stopPropagation()
      },
    },
  }
}

type DragHandlers = Partial<Record<'onDragOver' | 'onDragLeave' | 'onDrop', (e: DragEvent) => void>>

/** Both sets of drag handlers on one element, each called in turn. */
export function joinDragProps(a: DragHandlers, b: DragHandlers): DragHandlers {
  const out: DragHandlers = { ...a }
  for (const k of ['onDragOver', 'onDragLeave', 'onDrop'] as const) {
    const x = a[k]
    const y = b[k]
    if (x && y)
      out[k] = (e) => {
        x(e)
        y(e)
      }
    else if (y) out[k] = y
  }
  return out
}

/**
 * step9: a Names-tab group — a name dropped on it joins the group. step9 (2026-11-17, third
 * request): a sub-name too (`onSubName`). step9 (2026-11-23): only its filter chip (the group
 * sections are gone).
 */
export function useGroupDrop(onDrop?: (name: string) => void, onSubName?: (sub: DraggedSubName) => void) {
  const [over, setOver] = useState(false)
  if (!onDrop && !onSubName) return { over: false, props: {} }
  return {
    over,
    props: {
      onDragOver: (e: DragEvent) => {
        const types = e.dataTransfer.types
        if (!(onDrop && types.includes(MIME)) && !(onSubName && types.includes(MIME_SUB_NAME))) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setOver(true)
      },
      onDragLeave: (e: DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false)
      },
      onDrop: (e: DragEvent) => {
        setOver(false)
        const sub = onSubName && e.dataTransfer.getData(MIME_SUB_NAME)
        if (sub) {
          e.preventDefault()
          onSubName(JSON.parse(sub) as DraggedSubName)
          return
        }
        const name = onDrop && e.dataTransfer.getData(MIME)
        if (!name) return
        e.preventDefault()
        onDrop(name)
      },
    },
  }
}
