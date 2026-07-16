/** UI copy when a trade is marked hidden (data redacted, not deleted). */
export const PRIVATE_TRADE_LABEL = 'Private'

/**
 * Trades that count toward performance: dashboard, analytics, P&amp;L calendar,
 * equity curve, heatmaps, symbol breakdown, etc. Hidden = journal-only / export.
 */
export function tradesForAggregations(trades) {
  if (!Array.isArray(trades)) return []
  return trades.filter((t) => !t?.hidden)
}
