import { toMoneyNumber } from '@/lib/utils'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEK = 7 * 86400000
export const ALL_WEEKS = 'all'

const pad = (n) => String(n).padStart(2, '0')
export const localDayKey = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function mondayStart(ms) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return +d
}

/**
 * The journal week containing `time`. Before any manual start, weeks are Monday–Sunday
 * (local time). After a manual start A, weeks repeat every 7 days from A. A manual start
 * cuts the week it lands in short, so no trade ever belongs to two weeks.
 * @param {number[]} anchors manual week starts (ms), ascending
 */
export function periodOf(time, anchors = []) {
  const t = +new Date(time)
  const prior = anchors.filter((a) => a <= t)
  let start, end
  if (prior.length) {
    const a = prior[prior.length - 1]
    start = a + Math.floor((t - a) / WEEK) * WEEK
    end = start + WEEK
  } else {
    start = mondayStart(t)
    const e = new Date(start)
    e.setDate(e.getDate() + 7)
    end = +e
  }
  const next = anchors.find((a) => a > start)
  if (next != null && next < end) end = next
  return { start, end }
}

function fmtDay(ms, withYear) {
  const d = new Date(ms)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${withYear ? `, ${d.getFullYear()}` : ''}`
}

function fmtTime(ms) {
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function periodLabel({ start, end }) {
  const last = end - 1
  const withYear = new Date(start).getFullYear() !== new Date().getFullYear()
  const midnight = (ms) => { const d = new Date(ms); return d.getHours() === 0 && d.getMinutes() === 0 }
  const from = `${fmtDay(start, withYear)}${midnight(start) ? '' : ` ${fmtTime(start)}`}`
  const to = new Date(start).getMonth() === new Date(last).getMonth() && midnight(end) && midnight(start)
    ? String(new Date(last).getDate())
    : `${fmtDay(last)}${midnight(end) ? '' : ` ${fmtTime(end)}`}`
  return `${from} – ${to}`
}

/** Weeks that have trades, newest first, plus the current and previous week even when empty. */
export function buildWeeks(rows, anchors) {
  const map = {}
  const add = (p) => (map[p.start] ||= { ...p, trades: 0, net: 0 })
  for (const r of rows) {
    const w = add(periodOf(r.entryDate, anchors))
    w.trades++
    if (!r.hidden) w.net += toMoneyNumber(r.netPnl) ?? 0
  }
  // Always show this week and the one right before it — otherwise starting a new
  // week makes a week without trades look like it vanished.
  const current = add(periodOf(Date.now(), anchors))
  add(periodOf(current.start - 1, anchors))
  return Object.values(map).sort((a, b) => b.start - a.start)
}
