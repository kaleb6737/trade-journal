import { rOf } from './rMultiple'
import { tradeOccurredAt } from './money'

export const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
export function quantile(sorted, p) {
  if (!sorted.length) return null
  const index = (sorted.length - 1) * p
  const low = Math.floor(index)
  return sorted[low] + (sorted[Math.ceil(index)] - sorted[low]) * (index - low)
}
const list = value => {
  try { const result = Array.isArray(value) ? value : JSON.parse(value || '[]'); return Array.isArray(result) ? [...new Set(result.filter(x => typeof x === 'string'))] : [] } catch { return [] }
}
export function eligibleRTrades(trades) {
  return trades.filter(t => !t.hidden && t.status === 'CLOSED' && rOf(t) != null && Number.isFinite(Date.parse(tradeOccurredAt(t))))
    .slice().sort((a, b) => Date.parse(tradeOccurredAt(a)) - Date.parse(tradeOccurredAt(b)) || String(a.id).localeCompare(String(b.id)))
}
export function summarizeEdge(values) {
  const n = values.length, avg = mean(values)
  const winners = values.filter(x => x > 0), losers = values.filter(x => x < 0)
  const grossWin = winners.reduce((a, b) => a + b, 0), grossLoss = -losers.reduce((a, b) => a + b, 0)
  const deviation = n > 1 ? Math.sqrt(values.reduce((s, r) => s + (r - avg) ** 2, 0) / (n - 1)) : null
  let cumulative = 0, peak = 0, drawdown = 0, underwater = 0, longestRecovery = 0, lossStreak = 0, maxLossStreak = 0
  values.forEach(r => {
    cumulative += r; peak = Math.max(peak, cumulative); drawdown = Math.min(drawdown, cumulative - peak)
    underwater = cumulative < peak - 1e-9 ? underwater + 1 : 0
    longestRecovery = Math.max(longestRecovery, underwater)
    lossStreak = r < 0 ? lossStreak + 1 : 0; maxLossStreak = Math.max(maxLossStreak, lossStreak)
  })
  const avgWin = mean(winners), avgLoss = mean(losers)
  const ordered = [...values].sort((a, b) => a - b)
  return { n, avg, total: cumulative, deviation, median: quantile(ordered, .5), avgWin, avgLoss,
    winRate: n ? winners.length / n * 100 : null,
    decidedWinRate: winners.length + losers.length ? winners.length / (winners.length + losers.length) * 100 : null,
    breakevens: n - winners.length - losers.length,
    profitFactor: grossLoss ? grossWin / grossLoss : grossWin ? Infinity : null,
    payoff: avgWin != null && avgLoss != null ? avgWin / Math.abs(avgLoss) : null,
    breakEvenRate: avgWin != null && avgLoss != null ? Math.abs(avgLoss) / (avgWin + Math.abs(avgLoss)) * 100 : null,
    drawdown, currentDrawdown: cumulative - peak, longestRecovery, maxLossStreak,
    tailLoss: mean(ordered.slice(0, Math.max(1, Math.ceil(n * .1)))),
    belowOne: values.filter(r => r < -1).length,
    withoutBest: n > 1 ? (cumulative - Math.max(...values)) / (n - 1) : null,
  }
}
function random(seed = 73421) {
  let state = seed >>> 0
  return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296 }
}
// Percentile bootstrap of the mean, deterministic for reproducible review.
export function bootstrapMean(values, runs = 800) {
  if (values.length < 5) return null
  const rand = random(), means = []
  for (let i = 0; i < runs; i++) {
    let sum = 0
    for (let j = 0; j < values.length; j++) sum += values[Math.floor(rand() * values.length)]
    means.push(sum / values.length)
  }
  means.sort((a, b) => a - b)
  return { low: quantile(means, .025), high: quantile(means, .975) }
}
export function buildEdgeAnalytics(trades, { window = 20, dimension = 'playbook', playbooks = [], minSample = 5 } = {}) {
  const eligible = eligibleRTrades(trades), values = eligible.map(rOf), stats = summarizeEdge(values)
  const names = new Map(playbooks.map(p => [p.id, p.name]))
  const groups = new Map(), timing = new Map(), behaviors = new Map()
  const add = (map, key, r) => { if (!map.has(key)) map.set(key, []); map.get(key).push(r) }
  let total = 0, peak = 0
  const curve = [{ n: 0, cumulative: 0, drawdown: 0, rolling: null }]
  eligible.forEach((t, i) => {
    const r = values[i], date = new Date(tradeOccurredAt(t)); total += r; peak = Math.max(peak, total)
    curve.push({ n: i + 1, cumulative: total, drawdown: total - peak, rolling: i + 1 >= window ? mean(values.slice(i + 1 - window, i + 1)) : null, r, symbol: t.symbol, date: date.toLocaleDateString() })
    const keys = dimension === 'tags' ? list(t.tags) : [dimension === 'playbook' ? names.get(t.playbookId) || 'No playbook' : dimension === 'session' ? t.tradeSession || 'Unlabeled' : dimension === 'weekday' ? date.toLocaleDateString('en-US', { weekday: 'long' }) : dimension === 'emotion' ? t.emotionScore ? `Focus ${t.emotionScore}/5` : 'Not recorded' : dimension === 'side' ? t.side : t.symbol]
    ;(keys.length ? keys : ['Untagged']).forEach(key => add(groups, key, r))
    // Entry time measures when the setup was taken; outcome curves use realization time.
    const entry = new Date(t.entryDate)
    if (Number.isFinite(entry.getTime())) add(timing, `${entry.getDay()}-${Math.floor(entry.getHours() / 4)}`, r)
    list(t.mistakes).forEach(key => add(behaviors, key, r))
  })
  const rows = Array.from(groups, ([name, rs]) => ({ name, ...summarizeEdge(rs), qualified: rs.length >= minSample })).sort((a, b) => b.avg - a.avg)
  const mistakes = Array.from(behaviors, ([name, rs]) => ({ name, ...summarizeEdge(rs) })).sort((a, b) => a.total - b.total)
  const split = Math.floor(values.length / 2)
  const first = summarizeEdge(values.slice(0, split)), second = summarizeEdge(values.slice(split))
  return { eligible, values, stats, curve, rows, mistakes, timing, first, second, interval: bootstrapMean(values),
    closed: trades.filter(t => !t.hidden && t.status === 'CLOSED').length,
    recent: summarizeEdge(values.slice(-window)), prior: summarizeEdge(values.slice(-window * 2, -window)),
  }
}
// IID resampling preserves observed outcomes, not serial dependence or regime changes.
export function simulateR(values, { horizon = 50, runs = 500, cost = 0, seed = 73421 } = {}) {
  if (values.length < 5) return null
  const rand = random(seed), steps = Array.from({ length: horizon + 1 }, () => []), drawdowns = []
  let losing = 0
  for (let run = 0; run < runs; run++) {
    let total = 0, peak = 0, worst = 0
    steps[0].push(0)
    for (let i = 1; i <= horizon; i++) {
      total += values[Math.floor(rand() * values.length)] - cost
      peak = Math.max(peak, total); worst = Math.max(worst, peak - total); steps[i].push(total)
    }
    if (total < 0) losing++
    drawdowns.push(worst)
  }
  drawdowns.sort((a, b) => a - b)
  const curve = steps.map((xs, n) => {
    xs.sort((a, b) => a - b)
    return { n, band: [quantile(xs, .05), quantile(xs, .95)], median: quantile(xs, .5) }
  })
  return { curve, end: curve[horizon], lossChance: losing / runs * 100, drawdown95: quantile(drawdowns, .95), runs }
}

export function filterAnalyticsTrades(trades, filters) {
  return trades.filter(t => {
    const date = new Date(tradeOccurredAt(t))
    const day = Number.isFinite(date.getTime()) ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : ''
    return (!filters.from || day >= filters.from) && (!filters.to || (day && day <= filters.to)) &&
      (!filters.symbol || t.symbol === filters.symbol) && (!filters.side || t.side === filters.side) &&
      (!filters.playbook || t.playbookId === filters.playbook) && (!filters.account || t.accountId === filters.account)
  })
}
