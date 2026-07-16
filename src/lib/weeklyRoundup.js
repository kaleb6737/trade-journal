import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
import { formatCurrency, tradeOutcome } from '@/lib/utils'
import { toMoneyNumber, tradeOccurredAt } from '@/lib/money'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getGroqKey() {
  return (process.env.GROQ_API_KEY || '').trim()
}

function parseNoteText(raw) {
  if (!raw) return ''
  try {
    const p = JSON.parse(raw)
    if (p?.html) return p.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400)
  } catch {}
  return String(raw).slice(0, 400)
}

export async function generateAiRoundupAnalysis(trades, stats) {
  const key = getGroqKey()
  if (!key) {
    console.error('[WeeklyRoundup] No Groq API key found. Set GROQ_API_KEY in .env.local')
    return null
  }
  console.log('[WeeklyRoundup] Calling Groq with', trades.length, 'trades')

  const tradeLines = trades.map((t, i) => {
    const outcome = tradeOutcome(t.netPnl)
    const pnl     = formatCurrency(toMoneyNumber(t.netPnl) ?? 0)
    const emo     = t.emotionScore ? `emotion=${t.emotionScore}/5` : ''
    let tags = []
    try { tags = JSON.parse(t.tags || '[]') } catch {}
    let emotionTags = []
    try { emotionTags = JSON.parse(t.emotionTags || '[]') } catch {}
    let mistakes = []
    try { mistakes = JSON.parse(t.mistakes || '[]') } catch {}
    const note = parseNoteText(t.notes)
    return [
      `Trade ${i + 1}: ${t.symbol} ${t.side} | ${outcome} ${pnl}`,
      t.tradeSession                     ? `  Session: ${t.tradeSession}` : '',
      t.playbook?.name                   ? `  Playbook: ${t.playbook.name}` : '',
      tags.length                        ? `  Tags: ${tags.join(', ')}` : '',
      emotionTags.length                 ? `  Emotions: ${emotionTags.join(', ')} ${emo}` : emo ? `  ${emo}` : '',
      mistakes.length                    ? `  Mistakes logged: ${mistakes.join(', ')}` : '',
      note                               ? `  Notes: ${note}` : '',
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  const prompt = `You are an experienced trading coach reviewing a trader's week.

WEEKLY STATS:
- Trades: ${stats.totalTrades} | ${stats.winners}W ${stats.losers}L | Win rate: ${stats.winRate.toFixed(1)}%
- Net P&L: ${formatCurrency(stats.netPnl)} | Avg per trade: ${formatCurrency(stats.avgPnl)}
- Best: ${stats.bestTrade ? `${stats.bestTrade.symbol} ${formatCurrency(stats.bestTrade.netPnl || 0)}` : 'N/A'}
- Worst: ${stats.worstTrade ? `${stats.worstTrade.symbol} ${formatCurrency(stats.worstTrade.netPnl || 0)}` : 'N/A'}

TRADES THIS WEEK:
${tradeLines || 'No detailed trade data available.'}

Respond ONLY with valid JSON (no markdown, no code fences):
{"strengths":["...","..."],"mistakes":["...","..."],"patterns":"...","focus":["...","..."],"mindset":"..."}

Be specific — reference actual symbols, P&L amounts, and emotions. Be direct, not generic.`

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 800,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('[WeeklyRoundup] Groq API error', res.status, JSON.stringify(data))
    return null
  }

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
  const aiAnalysis = await generateAiRoundupAnalysis(data.trades, data).catch(() => null)

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
