import { prisma } from '@/lib/prisma'
import { tradeOutcome, tradeStatsTimeZone, stripNotesToText } from '@/lib/utils'
import { toMoneyNumber, tradeOccurredAt } from '@/lib/money'

const MAX_PROMPT_TRADES = 60
// Groq's free tier rejects requests over ~8k tokens/min (prompt + reserved output),
// so the analytics JSON must stay ~2.5k tokens. Journal notes are the highest-signal
// input, so they get whatever room the numbers leave.
const PROMPT_CHAR_BUDGET = 8000
const MAX_NOTE_CHARS = 2000
// Below this, per-bucket breakdowns just restate the trade list — drop them for note space.
const FEW_TRADES = 8
const BASELINE_MIN_TRADES = 5

const pnlOf = (t) => toMoneyNumber(t.netPnl) ?? 0
const round = (n, d = 2) => (Number.isFinite(n) ? Number(n.toFixed(d)) : null)
const parseJson = (s) => { try { const v = JSON.parse(s || '[]'); return Array.isArray(v) ? v : [] } catch { return [] } }

function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null && v !== false && !(Array.isArray(v) && !v.length)))
}

function cleanText(raw, max) {
  const text = stripNotesToText(raw)
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  return text.length > max ? `${text.slice(0, max)}…` : text || null
}

function localParts(date, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(date))
  const get = (type) => parts.find((p) => p.type === type)?.value
  const hour = parseInt(get('hour'), 10) % 24
  return { day: `${get('year')}-${get('month')}-${get('day')}`, dow: get('weekday'), hour, minute: parseInt(get('minute'), 10) }
}

const hhmm = (p) => `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`

/** Core performance numbers for any list of closed trades. */
export function summarize(trades) {
  const wins = trades.filter((t) => tradeOutcome(t.netPnl) === 'WIN')
  const losses = trades.filter((t) => tradeOutcome(t.netPnl) === 'LOSS')
  const grossWin = wins.reduce((s, t) => s + pnlOf(t), 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + pnlOf(t), 0))
  const net = trades.reduce((s, t) => s + pnlOf(t), 0)
  const decided = wins.length + losses.length
  const avgWin = wins.length ? grossWin / wins.length : 0
  const avgLoss = losses.length ? grossLoss / losses.length : 0
  return {
    trades: trades.length,
    wins: wins.length,
    losses: losses.length,
    breakevens: trades.length - decided,
    net: round(net),
    winRate: decided ? round((wins.length / decided) * 100, 1) : null,
    profitFactor: grossLoss ? round(grossWin / grossLoss) : (grossWin ? 'inf' : null),
    avgWin: round(avgWin),
    avgLoss: round(avgLoss),
    payoffRatio: avgLoss ? round(avgWin / avgLoss) : null,
    expectancy: trades.length ? round(net / trades.length) : null,
    largestWin: wins.length ? round(Math.max(...wins.map(pnlOf))) : null,
    largestLoss: losses.length ? round(Math.min(...losses.map(pnlOf))) : null,
  }
}

function groupBy(trades, keyFn) {
  const map = {}
  for (const t of trades) {
    const keys = [].concat(keyFn(t)).filter(Boolean)
    for (const k of keys) (map[k] ||= []).push(t)
  }
  return Object.entries(map)
    .map(([key, list]) => {
      const s = summarize(list)
      return { key, trades: s.trades, net: s.net, winRate: s.winRate, expectancy: s.expectancy }
    })
    .sort((a, b) => a.net - b.net)
}

/**
 * Logged prices vs logged P&L. Manual entries often disagree (wrong side, several
 * fills rolled into one row), and conclusions drawn from bad prices are worse than none.
 */
function dataProblems(t) {
  const entry = toMoneyNumber(t.entryPrice)
  const exit = toMoneyNumber(t.exitPrice)
  const stop = toMoneyNumber(t.stopLoss)
  const net = pnlOf(t)
  const dir = t.side === 'SHORT' ? -1 : 1
  const problems = []
  if (entry != null && exit != null && exit !== entry && Math.abs(net) > 1 && Math.sign(dir * (exit - entry)) !== Math.sign(net)) {
    problems.push(`logged as ${t.side} ${entry}→${exit}, which would be a ${net < 0 ? 'win' : 'loss'}, but P&L is ${round(net)}`)
  }
  if (entry != null && stop != null && ((dir === 1 && stop >= entry) || (dir === -1 && stop <= entry))) {
    problems.push(`stop ${stop} is on the wrong side of a ${t.side} entry at ${entry}`)
  }
  return problems
}

/** R-multiple in price terms (no point value needed); only when prices are trustworthy. */
function rMultiple(t) {
  const entry = toMoneyNumber(t.entryPrice)
  const exit = toMoneyNumber(t.exitPrice)
  const stop = toMoneyNumber(t.stopLoss)
  if (entry == null || exit == null || stop == null || entry === stop || dataProblems(t).length) return null
  const dir = t.side === 'SHORT' ? -1 : 1
  return round((dir * (exit - entry)) / Math.abs(entry - stop))
}

function median(nums) {
  if (!nums.length) return null
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function afterLossBehavior(trades) {
  const followUps = []
  let quickReentries = 0
  for (let i = 1; i < trades.length; i++) {
    const prev = trades[i - 1]
    const cur = trades[i]
    if (tradeOutcome(prev.netPnl) !== 'LOSS' || prev._day.day !== cur._day.day) continue
    followUps.push(cur)
    const gapMin = (new Date(cur.entryDate) - new Date(tradeOccurredAt(prev))) / 60000
    if (gapMin >= 0 && gapMin < 15) quickReentries++
  }
  const s = summarize(followUps)
  return { tradesAfterALossSameDay: s.trades, theirNet: s.net, theirWinRate: s.winRate, reentriesWithin15Min: quickReentries }
}

function dailyBreakdown(trades) {
  const days = {}
  for (const t of trades) {
    const d = (days[t._day.day] ||= { day: t._day.day, dow: t._day.dow, trades: 0, net: 0, peak: 0, maxDrawdown: 0, running: 0 })
    d.trades++
    d.running += pnlOf(t)
    d.net = d.running
    d.peak = Math.max(d.peak, d.running)
    d.maxDrawdown = Math.min(d.maxDrawdown, d.running - d.peak)
  }
  return Object.values(days).map(({ running, peak, ...d }) => ({ ...d, net: round(d.net), maxDrawdown: round(d.maxDrawdown) }))
}

function longestLosingStreak(trades) {
  let cur = 0, max = 0
  for (const t of trades) {
    if (tradeOutcome(t.netPnl) === 'LOSS') max = Math.max(max, ++cur)
    else cur = 0
  }
  return max
}

function tradeLine(t, usualQty) {
  const qty = toMoneyNumber(t.quantity)
  const holdMin = t.exitDate ? Math.round((new Date(t.exitDate) - new Date(t.entryDate)) / 60000) : null
  const problems = dataProblems(t)
  return compact({
    entered: `${t._entry.dow} ${t._entry.day} ${hhmm(t._entry)}`,
    symbol: t.symbol,
    side: t.side,
    qty,
    result: tradeOutcome(t.netPnl),
    net: round(pnlOf(t)),
    r: rMultiple(t),
    holdMin,
    sizeVsUsual: usualQty && qty ? round(qty / usualQty, 2) : null,
    stopLogged: t.stopLoss != null,
    playbook: t.playbook?.name || null,
    session: t.tradeSession || null,
    tags: parseJson(t.tags),
    mistakes: parseJson(t.mistakes),
    emotion: t.emotionScore || null,
    emotionTags: parseJson(t.emotionTags),
    dataProblems: problems,
    notes: cleanText(t.notes, MAX_NOTE_CHARS),
  })
}

function fitToBudget(insights) {
  const size = () => JSON.stringify(insights).length
  const lines = insights.trades
  const impact = (t) => Math.abs(t.net ?? 0) + (t.mistakes?.length ? 1e6 : 0)
  const shorten = (s, max) => (s && s.length > max ? `${s.slice(0, max)}…` : s)

  if (lines.length <= FEW_TRADES) {
    for (const k of ['bySymbol', 'bySide', 'byPlaybook', 'bySession', 'byEntryHour', 'byDayOfWeek', 'byTag', 'byMistake']) delete insights[k]
    delete insights.emotions.byEmotionTag
  }
  // Shrink every note evenly first — keeps each trade's story, just shorter.
  for (let cap = MAX_NOTE_CHARS; cap >= 300 && size() > PROMPT_CHAR_BUDGET; cap -= 200) {
    lines.forEach((t) => { t.notes = shorten(t.notes, cap) })
    insights.noTradeDays.forEach((n) => { n.note = shorten(n.note, cap) })
  }
  for (const keep of [15, 8, 0]) {
    if (size() <= PROMPT_CHAR_BUDGET) return insights
    const kept = new Set([...lines].sort((a, b) => impact(b) - impact(a)).slice(0, keep))
    lines.forEach((t) => { if (!kept.has(t)) delete t.notes })
  }
  for (const bucket of ['byEntryHour', 'byTag', 'bySymbol']) {
    if (size() <= PROMPT_CHAR_BUDGET) return insights
    // Buckets are sorted worst→best; keep the 3 biggest leaks and 3 biggest edges.
    const list = insights[bucket]
    if (list?.length > 6) insights[bucket] = [...list.slice(0, 3), ...list.slice(-3)]
  }
  while (size() > PROMPT_CHAR_BUDGET && insights.trades.length > 10) {
    const drop = [...insights.trades].sort((a, b) => impact(a) - impact(b))[0]
    insights.trades = insights.trades.filter((t) => t !== drop)
    insights.tradesOmitted++
  }
  return insights
}

/**
 * Everything the AI coach needs: this week's trades (with full journal notes where
 * budget allows), a 4-week baseline when there is one, no-trade days, and the plan
 * from the PREVIOUS week's round-up so it can grade follow-through.
 */
export async function buildDeepInsights(userId, weekTrades, { start, end }) {
  const tz = tradeStatsTimeZone()
  const baselineStart = new Date(start.getTime() - 28 * 86400000)

  const [baselineRows, noTradeDays, lastLog] = await Promise.all([
    prisma.trade.findMany({
      where: {
        userId, hidden: false, status: 'CLOSED', netPnl: { not: null },
        OR: [
          { occurredAt: { gte: baselineStart, lt: start } },
          { occurredAt: null, entryDate: { gte: baselineStart, lt: start } },
        ],
      },
      select: { netPnl: true, quantity: true, symbol: true, occurredAt: true, exitDate: true, entryDate: true },
    }),
    prisma.noTradeDay.findMany({ where: { userId, date: { gte: start, lt: end } }, orderBy: { date: 'asc' } }),
    // A regenerated round-up for this same week is not "last week's plan".
    prisma.weeklyRoundupLog.findFirst({
      where: { userId, periodStart: { lt: new Date(start.getTime() - 3 * 86400000) } },
      orderBy: { periodStart: 'desc' },
      select: { aiAnalysis: true, periodStart: true, periodEnd: true },
    }),
  ])

  // Day buckets follow the calendar (realized day); timing follows when you entered.
  const trades = weekTrades.map((t) => ({ ...t, _day: localParts(tradeOccurredAt(t), tz), _entry: localParts(t.entryDate, tz) }))

  const usualQtyBySymbol = {}
  for (const sym of new Set(trades.map((t) => t.symbol))) {
    const qtys = baselineRows.filter((b) => b.symbol === sym).map((b) => toMoneyNumber(b.quantity)).filter(Boolean)
    if (qtys.length >= 3) usualQtyBySymbol[sym] = median(qtys)
  }

  const rValues = trades.map(rMultiple).filter((r) => r != null)
  const baseline = summarize(baselineRows)
  const tradingDaysBaseline = new Set(baselineRows.map((b) => localParts(tradeOccurredAt(b), tz).day)).size

  let lastWeekPlan = null
  if (lastLog?.aiAnalysis) {
    try {
      const a = JSON.parse(lastLog.aiAnalysis)
      lastWeekPlan = {
        week: `${lastLog.periodStart.toISOString().slice(0, 10)} → ${lastLog.periodEnd.toISOString().slice(0, 10)}`,
        focus: a.focus || [], gamePlan: a.gamePlan || null, watchlist: a.watchlist || [],
      }
    } catch {}
  }

  const hold = (outcome) => round(median(trades.filter((t) => tradeOutcome(t.netPnl) === outcome && t.exitDate).map((t) => (new Date(t.exitDate) - new Date(t.entryDate)) / 60000)), 0)
  const daily = dailyBreakdown(trades)
  const flagged = trades.filter((t) => dataProblems(t).length)

  return fitToBudget({
    timeZone: tz,
    period: { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
    week: {
      ...summarize(trades),
      tradingDays: daily.length,
      tradesPerDay: daily.length ? round(trades.length / daily.length, 1) : 0,
      longestLosingStreak: longestLosingStreak(trades),
      avgR: rValues.length ? round(rValues.reduce((s, r) => s + r, 0) / rValues.length) : null,
      tradesWithStopLogged: trades.filter((t) => t.stopLoss != null).length,
      medianHoldMinWinners: hold('WIN'),
      medianHoldMinLosers: hold('LOSS'),
    },
    baselinePrior4Weeks: baseline.trades >= BASELINE_MIN_TRADES
      ? { ...baseline, tradingDays: tradingDaysBaseline, tradesPerDay: tradingDaysBaseline ? round(baseline.trades / tradingDaysBaseline, 1) : 0 }
      : null,
    daily,
    bySymbol: groupBy(trades, (t) => t.symbol),
    bySide: groupBy(trades, (t) => t.side),
    byPlaybook: groupBy(trades, (t) => t.playbook?.name || 'No playbook'),
    bySession: groupBy(trades, (t) => t.tradeSession || 'Unlabeled'),
    byEntryHour: groupBy(trades, (t) => `${String(t._entry.hour).padStart(2, '0')}:00`),
    byDayOfWeek: groupBy(trades, (t) => t._day.dow),
    byTag: groupBy(trades, (t) => parseJson(t.tags)),
    byMistake: groupBy(trades, (t) => parseJson(t.mistakes)),
    afterLoss: afterLossBehavior(trades),
    emotions: {
      tradesWithCheckIn: trades.filter((t) => t.emotionScore).length,
      byScore: groupBy(trades.filter((t) => t.emotionScore), (t) => `score ${t.emotionScore}/5`),
      byEmotionTag: groupBy(trades, (t) => parseJson(t.emotionTags)),
    },
    tradesWithDataProblems: flagged.length,
    noTradeDays: noTradeDays.map((n) => compact({ day: n.date.toISOString().slice(0, 10), reasons: parseJson(n.tags), note: cleanText(n.reason, MAX_NOTE_CHARS) })),
    lastWeekPlan,
    trades: trades.slice(-MAX_PROMPT_TRADES).map((t) => tradeLine(t, usualQtyBySymbol[t.symbol])),
    tradesOmitted: Math.max(0, trades.length - MAX_PROMPT_TRADES),
  })
}
