/**
 * Coerce Prisma Decimal, number, or numeric string to a JS number for math / charts.
 * Returns null only when input is null/undefined or NaN after coercion.
 */
export function toMoneyNumber(value) {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    if (value.trim() === '') return null
    const n = parseFloat(value)
    return Number.isFinite(n) ? n : null
  }
  if (typeof value === 'object' && typeof value?.toString === 'function') {
    const n = parseFloat(value.toString())
    return Number.isFinite(n) ? n : null
  }
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** Canonical calendar instant for a trade (DB column preferred, then exit, then entry). */
export function tradeOccurredAt(t) {
  if (!t) return null
  return t.occurredAt || t.exitDate || t.entryDate || null
}

/**
 * When the trade is considered "realized" for sorting / equity curve.
 * Prefer exit time, else entry (manual / no-exit-date closes).
 */
export function deriveOccurredAt(exitDate, entryDate) {
  if (exitDate) return new Date(exitDate)
  if (entryDate) return new Date(entryDate)
  return new Date()
}
