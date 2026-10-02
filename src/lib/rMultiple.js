import { toMoneyNumber, tradeOccurredAt } from './money'

const round = (n, d = 2) => (Number.isFinite(n) ? Number(n.toFixed(d)) : null)

export function parseR(value) {
  if (value === '' || value == null) return null
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/r$/i, '').trim())
  return Number.isFinite(n) ? n : null
}

/**
 * Makes the sign match the trade's result, so traders can type "2" for a 2R loss.
 * An explicit sign that contradicts the P&L is also corrected — P&L is the source of truth.
 */
export function normalizeR(r, netPnl) {
  const n = parseR(r)
  if (n == null) return null
  const pnl = toMoneyNumber(netPnl)
  if (pnl == null || Math.abs(pnl) < 0.005) return n
  return pnl > 0 ? Math.abs(n) : -Math.abs(n)
}

/** R implied by logged prices: (exit − entry) ÷ (entry − stop), signed by direction. */
export function suggestR({ side, entryPrice, exitPrice, stopLoss }) {
  const entry = parseFloat(entryPrice)
  const exit = parseFloat(exitPrice)
  const stop = parseFloat(stopLoss)
  if (![entry, exit, stop].every(Number.isFinite) || entry === stop) return null
  const dir = side === 'SHORT' ? -1 : 1
  // A stop on the profit side of entry isn't a risk stop — can't derive R from it.
  if ((dir === 1 && stop >= entry) || (dir === -1 && stop <= entry)) return null
  return round((dir * (exit - entry)) / Math.abs(entry - stop))
}

export const rOf = (t) => parseR(t?.rMultiple)

export const formatR = (r, { sign = true } = {}) => {
  if (r == null || !Number.isFinite(r)) return '—'
  const s = Math.abs(r) >= 10 ? r.toFixed(1) : r.toFixed(2)
  return `${sign && r > 0 ? '+' : ''}${s}R`
}

const BUCKETS = [
  { label: '≤ −2R', test: (r) => r <= -2 },
  { label: '−2 to −1R', test: (r) => r > -2 && r <= -1 },
  { label: '−1 to 0R', test: (r) => r > -1 && r < 0 },
  { label: '0R', test: (r) => r === 0 },
  { label: '0 to 1R', test: (r) => r > 0 && r < 1 },
  { label: '1 to 2R', test: (r) => r >= 1 && r < 2 },
  { label: '2 to 3R', test: (r) => r >= 2 && r < 3 },
  { label: '≥ 3R', test: (r) => r >= 3 },
]

function summarizeR(rs) {
  const wins = rs.filter((r) => r > 0)
  const losses = rs.filter((r) => r < 0)
  const grossWin = wins.reduce((s, r) => s + r, 0)
  const grossLoss = Math.abs(losses.reduce((s, r) => s + r, 0))
  const total = rs.reduce((s, r) => s + r, 0)
  return {
    count: rs.length,
    totalR: round(total),
    avgR: rs.length ? round(total / rs.length) : null,
    winRate: wins.length + losses.length ? round((wins.length / (wins.length + losses.length)) * 100, 1) : null,
    avgWinR: wins.length ? round(grossWin / wins.length) : null,
    avgLossR: losses.length ? round(-grossLoss / losses.length) : null,
    profitFactorR: grossLoss ? round(grossWin / grossLoss) : null,
    bestR: rs.length ? round(Math.max(...rs)) : null,
    worstR: rs.length ? round(Math.min(...rs)) : null,
  }
}

/** Every R-based number the analytics page shows, from closed trades. */
export function buildRStats(trades, { playbookName = () => null } = {}) {
  const closed = trades.filter((t) => t.status === 'CLOSED')
  const withR = closed
    .filter((t) => rOf(t) != null && tradeOccurredAt(t))
    .sort((a, b) => new Date(tradeOccurredAt(a)) - new Date(tradeOccurredAt(b)))
  const rs = withR.map(rOf)

  let cum = 0, peak = 0, maxDrawdownR = 0, streak = 0, worstLosingStreakR = 0
  const curve = withR.map((t, i) => {
    const r = rOf(t)
    cum += r
    peak = Math.max(peak, cum)
    maxDrawdownR = Math.min(maxDrawdownR, cum - peak)
    streak = r < 0 ? streak + r : 0
    worstLosingStreakR = Math.min(worstLosingStreakR, streak)
    return { n: i + 1, date: tradeOccurredAt(t), symbol: t.symbol, r: round(r), cumR: round(cum) }
  })

  const group = (keyFn) => {
    const map = {}
    for (const t of withR) {
      const key = keyFn(t) || '—'
      ;(map[key] ||= []).push(rOf(t))
    }
    return Object.entries(map)
      .map(([name, list]) => ({ name, ...summarizeR(list) }))
      .sort((a, b) => b.totalR - a.totalR)
  }

  const dow = (t) => new Date(tradeOccurredAt(t)).toLocaleDateString('en-US', { weekday: 'short' })

  return {
    ...summarizeR(rs),
    closedTrades: closed.length,
    coverage: closed.length ? round((withR.length / closed.length) * 100, 0) : 0,
    missing: closed.length - withR.length,
    maxDrawdownR: round(maxDrawdownR),
    worstLosingStreakR: round(worstLosingStreakR),
    curve,
    distribution: BUCKETS.map((b) => ({ bucket: b.label, count: rs.filter(b.test).length, positive: !b.label.includes('−') && b.label !== '0R' })),
    byPlaybook: group((t) => playbookName(t.playbookId) || 'No playbook'),
    bySession: group((t) => t.tradeSession || 'Unlabeled'),
    bySymbol: group((t) => t.symbol),
    bySide: group((t) => t.side),
    byDay: group(dow),
  }
}
