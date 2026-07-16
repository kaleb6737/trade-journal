'use client'

import { useState, Fragment } from 'react'
import Link from 'next/link'
import { formatCurrency, toDateKeyInTimeZone, tradeStatsTimeZone } from '@/lib/utils'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

const CAL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const CAL_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CAL_DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function PnLCalendar({ calendar = {}, statsTimeZone: statsTimeZoneProp }) {
  const statsTimeZone = statsTimeZoneProp ?? tradeStatsTimeZone()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else setMonth((m) => m + 1)
  }

  const firstDow = new Date(year, month, 1).getDay()
  const startPad = firstDow === 0 ? 6 : firstDow - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const todayKey = toDateKeyInTimeZone(now, statsTimeZone)
  const getKey = (d) => (d ? `${monthKey}-${String(d).padStart(2, '0')}` : null)
  const getData = (d) => (d && calendar[getKey(d)]) || null

  const weekTotals = weeks.map((w) => w.reduce((s, d) => s + (getData(d)?.pnl || 0), 0))
  const monthTotal = Object.entries(calendar)
    .filter(([k]) => k.startsWith(monthKey))
    .reduce((s, [, v]) => s + v.pnl, 0)
  const monthTrades = Object.entries(calendar)
    .filter(([k]) => k.startsWith(monthKey))
    .reduce((s, [, v]) => s + v.count, 0)
  const winDays = Object.entries(calendar).filter(([k]) => k.startsWith(monthKey) && calendar[k].pnl > 0).length
  const lossDays = Object.entries(calendar).filter(([k]) => k.startsWith(monthKey) && calendar[k].pnl < 0).length

  const cellBg = (pnl) => {
    if (!pnl) return undefined
    const a = Math.abs(pnl) < 200 ? 0.14 : Math.abs(pnl) < 1000 ? 0.26 : 0.42
    return pnl > 0 ? `rgba(34,197,94,${a})` : `rgba(239,68,68,${a})`
  }
  const cellBorder = (pnl) => {
    if (!pnl) return undefined
    return pnl > 0 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'
  }

  const fmtTooltip = (day, data) => {
    const base = `${CAL_SHORT[month]} ${day}`
    if (!data) return base
    const sign = data.pnl >= 0 ? '+' : ''
    return `${base}  ·  ${sign}${formatCurrency(data.pnl)}  ·  ${data.count} trade${data.count !== 1 ? 's' : ''}`
  }

  return (
    <div className="pnl-cal card">
      <div className="pnl-cal-header">
        <div className="pnl-cal-title-wrap">
          <CalendarDays size={16} style={{ color: 'var(--gold-primary)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className="pnl-cal-title">P&amp;L Calendar</div>
            <div className="pnl-cal-subtitle">Daily performance at a glance</div>
          </div>
        </div>

        <div className="pnl-cal-nav">
          <button type="button" className="pnl-cal-nav-btn" onClick={prevMonth} aria-label="Previous month">
            <ChevronLeft size={15} />
          </button>
          <span className="pnl-cal-month-label">
            {CAL_MONTHS[month]} {year}
          </span>
          <button type="button" className="pnl-cal-nav-btn" onClick={nextMonth} aria-label="Next month">
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="pnl-cal-month-stats">
          <div className={`pnl-cal-month-total ${monthTotal >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>{formatCurrency(monthTotal)}</div>
          <div className="pnl-cal-month-meta">
            {monthTrades} trades · <span style={{ color: 'var(--green)' }}>{winDays}W</span> /{' '}
            <span style={{ color: 'var(--red)' }}>{lossDays}L</span> days
          </div>
        </div>
      </div>

      <div className="pnl-cal-grid" key={`${year}-${month}`}>
        {CAL_DOW.map((d) => (
          <div key={d} className="pnl-cal-dow">
            {d}
          </div>
        ))}
        <div className="pnl-cal-dow pnl-cal-dow--week">Week</div>

        {weeks.map((week, wi) => (
          <Fragment key={wi}>
            {week.map((day, di) => {
              const data = getData(day)
              const key = getKey(day)
              const isToday = key === todayKey
              const idx = wi * 7 + di
              const CellWrapper = day ? Link : 'div'
              const wrapperProps = day ? { href: data?.tradeId ? `/journal/${data.tradeId}` : `/journal?date=${key}` } : {}

              return (
                <CellWrapper
                  {...wrapperProps}
                  key={`${wi}-${di}`}
                  className={[
                    'pnl-cal-cell',
                    !day ? 'pnl-cal-cell--empty' : '',
                    isToday ? 'pnl-cal-cell--today' : '',
                    data?.pnl > 0 ? 'pnl-cal-cell--win' : '',
                    data?.pnl < 0 ? 'pnl-cal-cell--loss' : '',
                    day ? 'cursor-pointer hover:ring-2 hover:ring-[var(--gold-primary)] transition-all' : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    '--cell-idx': idx,
                    background: data ? cellBg(data.pnl) : undefined,
                    borderColor: data ? cellBorder(data.pnl) : undefined,
                    textDecoration: 'none',
                    color: 'inherit'
                  }}
                  data-tooltip={day ? fmtTooltip(day, data) : undefined}
                >
                  {day && (
                    <>
                      <span className="pnl-cal-day-num">{day}</span>
                      {data ? (
                        <span className="pnl-cal-day-body">
                          <span className={`pnl-cal-day-pnl ${data.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
                            {formatCurrency(data.pnl)}
                          </span>
                          <span className="pnl-cal-day-trades">{data.count}t</span>
                        </span>
                      ) : null}
                      {data?.pnl > 0 && <span className="pnl-cal-shimmer" aria-hidden />}
                    </>
                  )}
                </CellWrapper>
              )
            })}

            <div
              key={`wt-${wi}`}
              className={`pnl-cal-week-total ${weekTotals[wi] > 0 ? 'pnl-positive' : weekTotals[wi] < 0 ? 'pnl-negative' : 'pnl-cal-week-total--empty'}`}
              style={{ '--cell-idx': wi * 7 + 7 }}
            >
              {weekTotals[wi] !== 0 ? (
                formatCurrency(weekTotals[wi])
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
              )}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
