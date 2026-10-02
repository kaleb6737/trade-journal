import { format, parseISO, differenceInMinutes, differenceInHours } from 'date-fns'
import { toMoneyNumber, tradeOccurredAt } from './money'

export { toMoneyNumber }

/** Dollar P&L within ±this is treated as breakeven (float / rounding noise). */
export const PNL_BE_EPSILON = 0.005

/**
 * @param {unknown} netPnl
 * @returns {'WIN' | 'LOSS' | 'BE' | null}
 */
export function tradeOutcome(netPnl) {
  const n = toMoneyNumber(netPnl)
  if (n == null) return null
  if (n > PNL_BE_EPSILON) return 'WIN'
  if (n < -PNL_BE_EPSILON) return 'LOSS'
  return 'BE'
}

// Format currency
export function formatCurrency(value, currency = 'USD') {
  const n = toMoneyNumber(value)
  if (n == null) return '—'
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n))
  return n < 0 ? `-${formatted}` : formatted
}

// Format percentage
export function formatPercent(value, decimals = 2) {
  const n = toMoneyNumber(value)
  if (n == null) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`
}

// Format number with commas
export function formatNumber(value, decimals = 0) {
  const n = toMoneyNumber(value)
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

// Format date
export function formatDate(date, fmt = 'MMM d, yyyy') {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, fmt)
  } catch { return '—' }
}

// Format datetime
export function formatDateTime(date, fmt = 'MMM d, yyyy h:mm a') {
  return formatDate(date, fmt)
}

/** Local calendar yyyy-MM-dd — matches month grids and `new Date()`-based UI. */
export function toLocalDateKey(date) {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const LONG_WEEKDAY_TO_SHORT = {
  Sunday: 'Sun',
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
}

/**
 * IANA zone for P&amp;L calendar + day-of-week charts (defaults to US Eastern).
 * Set TRADE_STATS_TZ (e.g. Europe/London). In the browser, when unset, uses the device zone.
 */
export function tradeStatsTimeZone() {
  const fromEnv = typeof process !== 'undefined' && process.env.TRADE_STATS_TZ?.trim()
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined' && typeof Intl !== 'undefined') {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      /* ignore */
    }
  }
  return 'America/New_York'
}

/**
 * Resolves the zone used for calendar / day-of-week stats.
 * Env TRADE_STATS_TZ wins; else a valid `clientHint` (e.g. from `?tz=`); else tradeStatsTimeZone().
 */
export function resolveTradeStatsTimeZone(clientHint) {
  const fromEnv = typeof process !== 'undefined' && process.env.TRADE_STATS_TZ?.trim()
  if (fromEnv) return fromEnv
  const h = typeof clientHint === 'string' ? clientHint.trim() : ''
  if (h) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: h }).format(new Date())
      return h
    } catch {
      /* ignore */
    }
  }
  return tradeStatsTimeZone()
}

/** yyyy-MM-dd for `date` in `timeZone` (avoids server-UTC vs local weekday bugs). */
export function toDateKeyInTimeZone(date, timeZone = tradeStatsTimeZone()) {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  if (!y || !m || !day) return null
  return `${y}-${m}-${day}`
}

/** Sun..Sat label for `date` in `timeZone`. */
export function weekdayShortInTimeZone(date, timeZone = tradeStatsTimeZone()) {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null
  const long = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(d)
  if (LONG_WEEKDAY_TO_SHORT[long]) return LONG_WEEKDAY_TO_SHORT[long]
  const short = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(d)
  const order = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return order.find((x) => short === x || short.startsWith(x)) || null
}

/** Canonical instant for charts: `occurredAt` (DB), else exit, else entry. */
export function tradeDate(t) {
  return tradeOccurredAt(t)
}

// Calculate hold time string
export function getHoldTime(entryDate, exitDate) {
  if (!entryDate || !exitDate) return '—'
  const entry = typeof entryDate === 'string' ? parseISO(entryDate) : entryDate
  const exit  = typeof exitDate  === 'string' ? parseISO(exitDate)  : exitDate
  const mins  = differenceInMinutes(exit, entry)
  if (mins < 60) return `${mins}m`
  const hrs = differenceInHours(exit, entry)
  const remainMins = mins - hrs * 60
  if (hrs < 24) return `${hrs}h ${remainMins}m`
  const days = Math.floor(hrs / 24)
  return `${days}d ${hrs % 24}h`
}

// Calculate trade P&L
export function calcPnl(trade) {
  const ep = toMoneyNumber(trade.entryPrice)
  const xp = toMoneyNumber(trade.exitPrice)
  const qty = toMoneyNumber(trade.quantity)
  if (ep == null || xp == null || qty == null) return null
  const direction = trade.side === 'LONG' ? 1 : -1
  const gross = direction * (xp - ep) * qty
  const net = gross - (toMoneyNumber(trade.commission) ?? 0) - (toMoneyNumber(trade.fees) ?? 0)
  return { grossPnl: gross, netPnl: net }
}

// Compute aggregate stats from an array of trades
export function computeStats(trades) {
  const closed = trades.filter(t => t.status === 'CLOSED' && t.netPnl != null && toMoneyNumber(t.netPnl) != null)
  if (!closed.length) return {
    totalTrades: 0, openTrades: trades.filter(t => t.status === 'OPEN').length, winners: 0, losers: 0, breakevens: 0, winRate: 0, netPnl: 0, grossPnl: 0,
    avgWin: 0, avgLoss: 0, profitFactor: 0, largestWin: 0, largestLoss: 0,
    avgHoldTime: '—', ztScore: 0,
  }

  const winners = closed.filter((t) => tradeOutcome(t.netPnl) === 'WIN')
  const losers = closed.filter((t) => tradeOutcome(t.netPnl) === 'LOSS')
  const breakevens = closed.filter((t) => tradeOutcome(t.netPnl) === 'BE')

  const netPnl   = closed.reduce((s, t) => s + (toMoneyNumber(t.netPnl) ?? 0), 0)
  const grossPnl = closed.reduce((s, t) => s + (toMoneyNumber(t.grossPnl) ?? 0), 0)

  const totalWins  = winners.reduce((s, t) => s + (toMoneyNumber(t.netPnl) ?? 0), 0)
  const totalLoss  = Math.abs(losers.reduce((s, t) => s + (toMoneyNumber(t.netPnl) ?? 0), 0))
  const avgWin     = winners.length ? totalWins / winners.length : 0
  const avgLoss    = losers.length  ? totalLoss / losers.length  : 0
  const profitFactor = totalLoss > 0 ? totalWins / totalLoss : totalWins > 0 ? 99 : 0
  const largestWin  = winners.length ? Math.max(...winners.map(t => toMoneyNumber(t.netPnl) ?? 0)) : 0
  const largestLoss = losers.length  ? Math.min(...losers.map(t => toMoneyNumber(t.netPnl) ?? 0))  : 0

  const decided = winners.length + losers.length
  const winRate = decided ? (winners.length / decided) * 100 : 0

  // Essence Score (0-100): weighted composite
  const ztScore = Math.min(100, Math.round(
    winRate * 0.4 +
    Math.min(profitFactor, 5) / 5 * 100 * 0.35 +
    (netPnl > 0 ? 25 : 0)
  ))

  return {
    totalTrades: closed.length,
    openTrades: trades.filter(t => t.status === 'OPEN').length,
    winners: winners.length,
    losers: losers.length,
    breakevens: breakevens.length,
    winRate,
    netPnl,
    grossPnl,
    avgWin,
    avgLoss,
    profitFactor,
    largestWin,
    largestLoss,
    ztScore,
  }
}

// Build equity curve data
export function buildEquityCurve(trades, initialBalance = 0) {
  const closed = [...trades]
    .filter(t => t.status === 'CLOSED' && t.netPnl != null && tradeDate(t))
    .sort((a, b) => new Date(tradeDate(a)) - new Date(tradeDate(b)))

  let running = toMoneyNumber(initialBalance) ?? 0
  return closed.map(t => {
    const pnl = toMoneyNumber(t.netPnl) ?? 0
    running += pnl
    return {
      date: formatDate(tradeDate(t), 'MMM d'),
      value: parseFloat(running.toFixed(2)),
      pnl,
      symbol: t.symbol,
    }
  })
}

// Build P&L by day of week (uses optional IANA zone — pass browser `?tz=` from dashboard API)
export function buildDayOfWeekData(trades, ianaTimeZone) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const map = {}
  days.forEach(d => { map[d] = { pnl: 0, count: 0 } })

  const tz = ianaTimeZone || tradeStatsTimeZone()

  trades
    .filter(t => t.status === 'CLOSED' && t.netPnl != null && tradeDate(t))
    .forEach(t => {
      const day = weekdayShortInTimeZone(tradeDate(t), tz)
      if (!day || !map[day]) return
      map[day].pnl += toMoneyNumber(t.netPnl) ?? 0
      map[day].count += 1
    })

  return days.map(d => ({ day: d, pnl: parseFloat(map[d].pnl.toFixed(2)), count: map[d].count }))
}

// Build P&L by Session
export function buildSessionData(trades) {
  const map = {}
  
  trades
    .filter(t => t.status === 'CLOSED' && t.netPnl != null && t.tradeSession)
    .forEach(t => {
      const session = t.tradeSession
      if (!map[session]) map[session] = { session, pnl: 0, count: 0 }
      map[session].pnl += toMoneyNumber(t.netPnl) ?? 0
      map[session].count += 1
    })

  return Object.values(map)
    .map(s => ({ ...s, pnl: parseFloat(s.pnl.toFixed(2)) }))
    .sort((a, b) => b.pnl - a.pnl)
}

// Calendar heatmap data — buckets every closed trade with a PnL into its
// local calendar day. Uses exitDate when present, otherwise falls back to
// entryDate so manually-logged trades (which often have no exit) still show.
export function buildCalendarData(trades, ianaTimeZone) {
  const map = {}
  const tz = ianaTimeZone || tradeStatsTimeZone()
  trades
    // A trade with a realized P&L (even $0 / breakeven) belongs on the calendar
    // regardless of its OPEN/CLOSED housekeeping flag — that flag can lag behind
    // manually-entered exit info.
    .filter(t => t.netPnl != null && tradeDate(t))
    .forEach(t => {
      const key = toDateKeyInTimeZone(tradeDate(t), tz)
      if (!key) return
      if (!map[key]) map[key] = { pnl: 0, count: 0, date: key, tradeId: t.id }
      map[key].pnl += toMoneyNumber(t.netPnl) ?? 0
      map[key].count += 1
    })
  for (const k of Object.keys(map)) {
    map[k].pnl = parseFloat(Number(map[k].pnl).toFixed(2))
  }
  return map
}

/**
 * Per-playbook stats from closed trades (playbookId on trade). Merges playbook name/color from API list.
 * Includes a synthetic row for trades with no playbook when present.
 */
export function buildPlaybookStats(trades, playbooks = []) {
  const pbById = Object.fromEntries(playbooks.map((p) => [p.id, p]))
  const closed = trades.filter((t) => t.status === 'CLOSED' && t.netPnl != null && toMoneyNumber(t.netPnl) != null)
  const buckets = {}

  for (const t of closed) {
    const id = t.playbookId || '__none__'
    if (!buckets[id]) buckets[id] = []
    buckets[id].push(t)
  }

  const rows = []
  for (const [id, list] of Object.entries(buckets)) {
    const isNone = id === '__none__'
    const pb = isNone ? null : pbById[id]
    const name = pb?.name || (isNone ? 'No playbook' : 'Deleted playbook')
    const color = pb?.color || '#6B7280'

    const winners = list.filter((t) => tradeOutcome(t.netPnl) === 'WIN')
    const losers = list.filter((t) => tradeOutcome(t.netPnl) === 'LOSS')
    const breakevens = list.filter((t) => tradeOutcome(t.netPnl) === 'BE')
    const n = list.length
    const decided = winners.length + losers.length
    const winRate = decided ? (winners.length / decided) * 100 : 0
    const netPnl = list.reduce((s, t) => s + (toMoneyNumber(t.netPnl) ?? 0), 0)
    const grossWins = winners.reduce((s, t) => s + (toMoneyNumber(t.netPnl) ?? 0), 0)
    const grossLossAbs = Math.abs(losers.reduce((s, t) => s + (toMoneyNumber(t.netPnl) ?? 0), 0))
    const profitFactor = grossLossAbs > 0 ? grossWins / grossLossAbs : grossWins > 0 ? 99 : 0
    const avgWin = winners.length ? grossWins / winners.length : 0
    const avgLoss = losers.length ? grossLossAbs / losers.length : 0
    const expectancy = n ? netPnl / n : 0

    const edgeScore = Math.min(
      100,
      Math.round(
        winRate * 0.38 +
          (Math.min(profitFactor, 5) / 5) * 100 * 0.32 +
          (expectancy > 0 ? 18 : expectancy === 0 ? 6 : 0) +
          (netPnl > 0 ? 12 : 0)
      )
    )

    rows.push({
      playbookId: isNone ? null : id,
      name,
      color,
      count: n,
      wins: winners.length,
      losses: losers.length,
      breakevens: breakevens.length,
      winRate,
      netPnl,
      profitFactor,
      expectancy,
      avgWin,
      avgLoss,
      edgeScore,
    })
  }

  return rows.sort((a, b) => b.count - a.count)
}

// P&L by symbol
export function buildSymbolData(trades) {
  const map = {}
  trades
    .filter(t => t.status === 'CLOSED' && t.netPnl != null)
    .forEach(t => {
      if (!map[t.symbol]) map[t.symbol] = { symbol: t.symbol, pnl: 0, count: 0, wins: 0, breakevens: 0 }
      const pnl = toMoneyNumber(t.netPnl) ?? 0
      map[t.symbol].pnl += pnl
      map[t.symbol].count += 1
      const o = tradeOutcome(t.netPnl)
      if (o === 'WIN') map[t.symbol].wins += 1
      if (o === 'BE') map[t.symbol].breakevens += 1
    })
  return Object.values(map).sort((a, b) => b.pnl - a.pnl)
}

// Activity Heatmap data (Github-style streak)
export function buildActivityData(trades) {
  const map = {}
  
  trades.forEach(t => {
    if (!t.entryDate) return
    let d = typeof t.entryDate === 'string' ? parseISO(t.entryDate) : t.entryDate
    try {
      const key = format(d, 'yyyy-MM-dd')
      if (!map[key]) map[key] = 0
      map[key] += 1
    } catch {}
  })

  const uniqueDates = Object.keys(map).sort()
  
  let longestStreak = 0
  let tempStreak = 0
  let lastDate = null
  
  for (let i = 0; i < uniqueDates.length; i++) {
    const curr = parseISO(uniqueDates[i])
    if (!lastDate) {
      tempStreak = 1
    } else {
      const diffDays = Math.round((curr - lastDate) / 86400000)
      if (diffDays === 1) {
        tempStreak++
      } else {
        tempStreak = 1
      }
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak
    lastDate = curr
  }
  
  let currentStreak = 0
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yestStr = format(yesterday, 'yyyy-MM-dd')

  if (map[todayStr] || map[yestStr]) {
    let checkDate = new Date(map[todayStr] ? todayStr : yestStr)
    currentStreak = 1
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1)
      const dateStr = format(checkDate, 'yyyy-MM-dd')
      if (map[dateStr]) {
        currentStreak++
      } else {
        break
      }
    }
  }

  const last365 = []
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = format(d, 'yyyy-MM-dd')
    last365.push({
      date: key,
      count: map[key] || 0
    })
  }

  return {
    history: last365,
    currentStreak,
    longestStreak,
    totalTradesLastYear: last365.reduce((s, d) => s + d.count, 0)
  }
}

// Parse tags safely
/** Strips a NotesEditor-serialized value (plain text or {v,html,images} JSON) down to plain text. */
export function stripNotesToText(raw) {
  if (!raw) return ''
  let html = raw
  try {
    const p = JSON.parse(raw)
    if (p && typeof p === 'object') html = p.html ?? p.text ?? ''
  } catch {}
  return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function parseTags(tagsJson) {
  try { return JSON.parse(tagsJson || '[]') }
  catch { return [] }
}

// Asset type colors
export const ASSET_COLORS = {
  STOCK: '#3B82F6',
  OPTIONS: '#8B5CF6',
  FOREX: '#10B981',
  FUTURES: '#F59E0B',
  CRYPTO: '#EC4899',
}

export const ASSET_TYPES = ['STOCK', 'OPTIONS', 'FOREX', 'FUTURES', 'CRYPTO']
export const TRADE_SIDES = ['LONG', 'SHORT']
export const BROKERS = [
  'Manual', 'ThinkorSwim', 'Interactive Brokers', 'TradeStation',
  'Webull', 'Tastytrade', 'Charles Schwab', 'E*TRADE', 'Alpaca',
  'Robinhood', 'Tradovate', 'NinjaTrader', 'Other'
]
export const NO_TRADE_REASONS = [
  'No Setup', 'Discipline', 'Overtraded Yesterday', 'Sick / Personal',
  'Market Closed', 'Traveling', 'News / High Volatility', 'Waited, Then Missed It',
]
