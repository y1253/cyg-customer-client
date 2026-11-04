import { useState } from 'react'

/**
 * A dialog's subject that outlives its closing: the value, or — once it turns null — the
 * last one it had. A dialog closes by its subject going null, but its popup still plays its
 * exit animation; rendering the body from this keeps the fields there until the box is gone,
 * instead of the two vanishing apart.
 */
export function useClosingValue<T>(value: T | null): T | null {
  const [last, setLast] = useState(value)
  if (value !== null && value !== last) setLast(value)
  return value ?? last
}
