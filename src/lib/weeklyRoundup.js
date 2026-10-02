import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
import { formatCurrency, tradeOutcome } from '@/lib/utils'
import { toMoneyNumber, tradeOccurredAt } from '@/lib/money'
import { buildDeepInsights } from '@/lib/roundupInsights'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const TPM_LIMIT = Number(process.env.GROQ_TPM_LIMIT) || 8000

function getGroqKey() {
  return (process.env.GROQ_API_KEY || '').trim()
}

const REPORT_SCHEMA = `{
  "headline": "one blunt sentence verdict on the week",
  "summary": "4-6 sentence executive summary: what happened, why, and the single biggest lever for next week",
  "processScore": { "score": 0-100, "rationale": "grade the PROCESS (discipline, risk, rule-following), not the P&L" },
  "keyNumbers": [ { "label": "metric name", "value": "the number", "read": "what it means for this trader (vs baseline only if one exists)" } ],
  "strengths": ["specific thing done well, citing trades/numbers"],
  "mistakes": ["specific costly mistake, citing trades, $ cost and the trigger"],
  "patterns": "the most important recurring pattern across trades, with evidence",
  "playbookReview": [ { "name": "playbook or setup", "verdict": "keep | refine | pause", "insight": "evidence-based why" } ],
  "riskAudit": { "rating": "strong | mixed | weak", "points": ["stop usage, R-multiples, sizing vs usual, drawdown days, loss/win asymmetry"] },
  "timing": [ { "window": "session / hour / weekday", "insight": "where edge shows up or leaks" } ],
  "psychology": ["emotion-score and emotion-tag findings, tilt/revenge signs after losses, no-trade-day discipline"],
  "lastWeekScorecard": [ { "item": "last week's focus item or rule", "status": "followed | partial | missed | unknown", "evidence": "..." } ],
  "gamePlan": {
    "primaryObjective": "the ONE process goal for next week",
    "dailyMaxLoss": "hard stop in $ derived from their numbers, with reasoning",
    "maxTradesPerDay": "number with reasoning",
    "focusSetups": ["setups/symbols/windows to prioritize and why"],
    "avoid": ["setups/symbols/windows/behaviors to cut and why"],
    "rules": [ { "if": "concrete trigger", "then": "concrete action" } ],
    "preMarketChecklist": ["short checklist items to do before each session"]
  },
  "watchlist": ["specific red flags to watch for in real time next week"],
  "focus": ["3-5 top priorities for next week (short)"],
  "mindset": "a direct, personal closing note on mindset for next week"
}`

export async function generateAiRoundupAnalysis(insights) {
  const key = getGroqKey()
  if (!key) {
    console.error('[WeeklyRoundup] No Groq API key found. Set GROQ_API_KEY in .env.local')
    return null
  }
  console.log('[WeeklyRoundup] Calling Groq with', insights.trades.length, 'trades')

  const prompt = `You are an elite trading performance coach doing a deep weekly review for a discretionary trader.
You get pre-computed analytics (JSON) for the week, every trade with the trader's own journal notes, no-trade days, and — when they exist — a 4-week baseline and the previous week's plan.

ACCURACY (most important — a wrong claim destroys the trader's trust):
- Only state facts that are in the data. Before writing any number, time, count or comparison, check it against the JSON. Never guess.
- The journal notes are the trader's own account and the best source for strategy, intent, framework, and what really happened (e.g. several entries rolled into one row). Use them heavily and quote short phrases. Never invent rules, strategies, frameworks, risk limits or setups the trader didn't write.
- Trades listing dataProblems have prices/side that contradict their P&L. Do not draw conclusions from those prices or their R; rely on P&L and notes, and mention the fix under mistakes or watchlist ("log each fill separately / correct the side").
- baselinePrior4Weeks null = no trading history before this week. Do not compare to a baseline anywhere; say once in the summary that this is the first tracked week.
- lastWeekPlan null = no previous plan. lastWeekScorecard must then be an empty array. If present, grade only its actual items.
- For timing, quote the exact "entered" times/days instead of characterizing them (don't call 14:24 "late afternoon" vs 14:47 "early afternoon").
- Missing fields mean not logged (no stopLogged = no stop recorded, not necessarily no stop placed — say "not logged").
- Fewer correct, specific items beat padded lists. It is fine to return 1-2 items in a section, or an empty array when the data says nothing.

DEPTH:
- Separate process from outcome: a loss that followed the plan is not a mistake; a win that broke rules is.
- Hunt for leaks: re-entries after losses, oversizing, missing stops, losers held longer than winners, entry times/sessions/days that lose, emotion scores tied to losses, patterns in the notes.
- gamePlan must be concrete and measurable and derived from THIS trader's numbers and notes (e.g. dailyMaxLoss from their avg loss/worst day and any risk rule they wrote), never generic advice.
- If data is thin, say what to log so next week's review is sharper.

FIELD GLOSSARY: net = $ P&L. r = R-multiple from logged prices. holdMin = minutes held. sizeVsUsual = quantity ÷ their median size over the prior 4 weeks. entered = entry time in ${insights.timeZone}. emotion = self-rated 1 (out of control) to 5 (fully focused). Currency USD.

ANALYTICS:
${JSON.stringify(insights)}

Respond ONLY with a single JSON object matching this shape exactly (no markdown):
${REPORT_SCHEMA}`

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      // Groq retires models; override with GROQ_MODEL without a code change.
      model: (process.env.GROQ_MODEL || 'openai/gpt-oss-120b').trim(),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      // gpt-oss reasons before answering; reasoning tokens count toward max_tokens.
      reasoning_effort: (process.env.GROQ_REASONING_EFFORT || 'medium').trim(),
      response_format: { type: 'json_object' },
      // Groq rejects a request when prompt + max_tokens exceeds the per-minute
      // token limit (8k on the free tier), so give output whatever the prompt leaves.
      max_tokens: Math.max(2500, TPM_LIMIT - Math.ceil(prompt.length / 3) - 150),
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('[WeeklyRoundup] Groq API error', res.status, JSON.stringify(data))
    if (res.status === 429 || res.status === 413) {
      const wait = /try again in ([\d.]+)s/i.exec(data?.error?.message || '')?.[1]
      const err = new Error(`The AI coach is rate-limited right now (Groq free tier). Try again in ${wait ? Math.ceil(Number(wait)) : 60} seconds.`)
      err.userFacing = true
      throw err
    }
    return null
  }

  console.log('[WeeklyRoundup] Groq usage', JSON.stringify({ ...data?.usage, finish: data?.choices?.[0]?.finish_reason }))
  const text  = data?.choices?.[0]?.message?.content || ''
  const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/s, '').trim()

  try {
    return JSON.parse(clean)
  } catch {
    console.error('[WeeklyRoundup] Failed to parse Groq response:', clean.slice(0, 300))
    return null
  }
}

function weekRange(now = new Date()) {
  const end = new Date(now)
  const start = new Date(now)
  start.setDate(start.getDate() - 7)
  return { start, end }
}

function asPct(n) {
  if (!Number.isFinite(n)) return '0.0%'
  return `${n.toFixed(1)}%`
}

function yes(v) {
  return v ? 'Yes' : 'No'
}

function buildReflectionPrompt(data) {
  return [
    'Weekly Reflection Prompts',
    '',
    `1) What was your best decision this week and why?`,
    `2) What was your biggest mistake and what trigger caused it?`,
    `3) Did you follow your plan consistently? ${yes(data.totalTrades > 0)} — describe any deviations.`,
    `4) Which setup/symbol performed best, and should you increase or reduce focus?`,
    `5) What is one concrete process change for next week?`,
  ].join('\n')
}

async function buildRoundupData(userId, now = new Date()) {
  const { start, end } = weekRange(now)

  const closed = await prisma.trade.findMany({
    where: { userId, hidden: false, status: 'CLOSED', netPnl: { not: null } },
    include: { playbook: { select: { name: true } } },
  })

  const trades = closed
    .filter((t) => {
      const when = tradeOccurredAt(t)
      if (!when) return false
      const d = new Date(when)
      return d >= start && d < end
    })
    .sort((a, b) => new Date(tradeOccurredAt(a)) - new Date(tradeOccurredAt(b)))

  const totalTrades = trades.length
  const winners = trades.filter((t) => tradeOutcome(t.netPnl) === 'WIN')
  const losers = trades.filter((t) => tradeOutcome(t.netPnl) === 'LOSS')
  const breakevens = trades.filter((t) => tradeOutcome(t.netPnl) === 'BE')
  const netPnl = trades.reduce((s, t) => s + (toMoneyNumber(t.netPnl) ?? 0), 0)
  const grossPnl = trades.reduce((s, t) => s + (toMoneyNumber(t.grossPnl) ?? 0), 0)
  const decided = winners.length + losers.length
  const winRate = decided ? (winners.length / decided) * 100 : 0
  const avgPnl = totalTrades ? netPnl / totalTrades : 0

  const bestTrade = [...trades].sort((a, b) => (toMoneyNumber(b.netPnl) ?? 0) - (toMoneyNumber(a.netPnl) ?? 0))[0] || null
  const worstTrade = [...trades].sort((a, b) => (toMoneyNumber(a.netPnl) ?? 0) - (toMoneyNumber(b.netPnl) ?? 0))[0] || null

  const symbolMap = {}
  for (const t of trades) {
    if (!symbolMap[t.symbol]) symbolMap[t.symbol] = { symbol: t.symbol, pnl: 0, count: 0 }
    symbolMap[t.symbol].pnl += toMoneyNumber(t.netPnl) ?? 0
    symbolMap[t.symbol].count += 1
  }
  const topSymbols = Object.values(symbolMap).sort((a, b) => b.pnl - a.pnl).slice(0, 3)

  return {
    start,
    end,
    totalTrades,
    winners: winners.length,
    losers: losers.length,
    breakevens: breakevens.length,
    netPnl,
    grossPnl,
    winRate,
    avgPnl,
    bestTrade,
    worstTrade,
    topSymbols,
    trades,
  }
}

function buildSubject(userName, data) {
  const label = data.netPnl >= 0 ? 'green' : 'red'
  return `TradeXEssence Weekly Roundup (${label}) — ${userName || 'Trader'}`
}

function buildSummaryText(userName, data) {
  const top = data.topSymbols.length
    ? data.topSymbols.map((s) => `${s.symbol} (${formatCurrency(s.pnl)})`).join(', ')
    : 'No symbols traded this week'

  return [
    `Hi ${userName || 'Trader'},`,
    '',
    `Here is your weekly trade roundup (${data.start.toLocaleDateString()} - ${data.end.toLocaleDateString()}):`,
    `- Closed trades: ${data.totalTrades}`,
    `- Record: ${data.winners}W / ${data.losers}L${data.breakevens ? ` / ${data.breakevens} BE` : ''}`,
    `- Win rate: ${asPct(data.winRate)} (excludes breakevens)`,
    `- Net P&L: ${formatCurrency(data.netPnl)}`,
    `- Avg trade P&L: ${formatCurrency(data.avgPnl)}`,
    `- Best trade: ${data.bestTrade ? `${data.bestTrade.symbol} (${formatCurrency(data.bestTrade.netPnl || 0)})` : 'N/A'}`,
    `- Worst trade: ${data.worstTrade ? `${data.worstTrade.symbol} (${formatCurrency(data.worstTrade.netPnl || 0)})` : 'N/A'}`,
    `- Top symbols: ${top}`,
    '',
    buildReflectionPrompt(data),
    '',
    'Open TradeXEssence and journal your weekly reflection while this recap is fresh.',
  ].join('\n')
}

function buildSummaryHtml(userName, data, reflectionPrompt) {
  const topSymbols = data.topSymbols.length
    ? data.topSymbols
        .map((s) => `<li><strong>${s.symbol}</strong> — ${formatCurrency(s.pnl)} (${s.count} trades)</li>`)
        .join('')
    : '<li>No symbols traded this week</li>'

  return `
  <div style="font-family: Inter, system-ui, sans-serif; color: #111; line-height: 1.55;">
    <h2 style="margin-bottom: 8px;">Weekly Roundup</h2>
    <p>Hi ${userName || 'Trader'}, here is your weekly recap <strong>(${data.start.toLocaleDateString()} - ${data.end.toLocaleDateString()})</strong>.</p>
    <ul>
      <li>Closed trades: <strong>${data.totalTrades}</strong></li>
      <li>Record: <strong>${data.winners}W / ${data.losers}L${data.breakevens ? ` / ${data.breakevens} BE` : ''}</strong></li>
      <li>Win rate: <strong>${asPct(data.winRate)}</strong> <span style="color:#666;font-size:12px">(wins ÷ wins+losses; BE excluded)</span></li>
      <li>Net P&L: <strong>${formatCurrency(data.netPnl)}</strong></li>
      <li>Average trade: <strong>${formatCurrency(data.avgPnl)}</strong></li>
      <li>Best trade: <strong>${data.bestTrade ? `${data.bestTrade.symbol} (${formatCurrency(data.bestTrade.netPnl || 0)})` : 'N/A'}</strong></li>
      <li>Worst trade: <strong>${data.worstTrade ? `${data.worstTrade.symbol} (${formatCurrency(data.worstTrade.netPnl || 0)})` : 'N/A'}</strong></li>
    </ul>
    <h3 style="margin: 18px 0 8px;">Top Symbols</h3>
    <ul>${topSymbols}</ul>
    <h3 style="margin: 18px 0 8px;">Reflection Prompts</h3>
    <pre style="white-space: pre-wrap; background: #f8f8f8; border: 1px solid #e5e5e5; padding: 12px; border-radius: 8px;">${reflectionPrompt}</pre>
    <p style="margin-top: 16px;">Log in to TradeXEssence and complete your weekly reflection.</p>
  </div>
  `
}

function smtpConfigured() {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
  )
}

async function sendEmail({ to, subject, text, html }) {
  if (!smtpConfigured()) {
    throw new Error('SMTP is not configured. Set SMTP_HOST/PORT/USER/PASS/FROM.')
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  })
}

export function isDueForWeeklyRoundup(user, now = new Date()) {
  if (!user.weeklyRoundupEnabled) return false
  if (user.plan !== 'PRO' && user.plan !== 'ULTIMATE') return false
  const day = now.getUTCDay()
  const hour = now.getUTCHours()
  if (day !== user.weeklyRoundupDay || hour < user.weeklyRoundupHour) return false
  if (!user.weeklyRoundupLastSentAt) return true
  const elapsed = now.getTime() - new Date(user.weeklyRoundupLastSentAt).getTime()
  return elapsed > 6 * 24 * 60 * 60 * 1000
}

export async function createAndSendWeeklyRoundup(user, { force = false, previewOnly = false } = {}) {
  const now = new Date()
  if (!force && !isDueForWeeklyRoundup(user, now)) {
    return { skipped: true, reason: 'Not due yet' }
  }
  const email = user.weeklyRoundupEmail || user.email
  if (!email) throw new Error('No email configured for weekly roundup')

  const data = await buildRoundupData(user.id, now)
  const reflectionPrompt = buildReflectionPrompt(data)
  const subject = buildSubject(user.name, data)
  const summaryText = buildSummaryText(user.name, data)
  const summaryHtml = buildSummaryHtml(user.name, data, reflectionPrompt)
  const aiAnalysis = await buildDeepInsights(user.id, data.trades, data)
    .then(generateAiRoundupAnalysis)
    .catch((e) => {
      console.error('[WeeklyRoundup] AI analysis failed:', e)
      // Manual generate/regenerate: surface it instead of saving an empty round-up.
      if (force && e.userFacing) throw e
      return null
    })

  if (!previewOnly) {
    await sendEmail({
      to: email,
      subject,
      text: summaryText,
      html: summaryHtml,
    })
  }

  await prisma.weeklyRoundupLog.create({
    data: {
      userId: user.id,
      email,
      subject,
      periodStart: data.start,
      periodEnd: data.end,
      createdTrades: data.totalTrades,
      winners: data.winners,
      losers: data.losers,
      netPnl: data.netPnl,
      summaryText,
      reflectionPrompt,
      aiAnalysis: aiAnalysis ? JSON.stringify(aiAnalysis) : null,
      sentAt: now,
    },
  })

  await prisma.user.update({
    where: { id: user.id },
    data: { weeklyRoundupLastSentAt: now },
  })

  return {
    skipped: false,
    email,
    subject,
    totalTrades: data.totalTrades,
    netPnl: data.netPnl,
    winRate: data.winRate,
    winners: data.winners,
    losers: data.losers,
    reflectionPrompt,
    aiAnalysis,
    previewOnly,
  }
}

export { DAYS, smtpConfigured }
