import { describe, it, expect, afterEach } from 'vitest'
import { computeStats, buildCalendarData, buildDayOfWeekData, buildEquityCurve, tradeDate, formatCurrency, resolveTradeStatsTimeZone, tradeOutcome } from './utils'
import { toMoneyNumber, tradeOccurredAt } from './money'

describe('toMoneyNumber', () => {
  it('coerces numeric strings', () => {
    expect(toMoneyNumber('407.5')).toBe(407.5)
  })
  it('returns null for garbage', () => {
    expect(toMoneyNumber(undefined)).toBeNull()
    expect(toMoneyNumber('')).toBeNull()
  })
})

describe('tradeDate / tradeOccurredAt', () => {
  it('prefers occurredAt', () => {
    const t = { occurredAt: new Date('2026-04-22T12:00:00Z'), exitDate: new Date('2026-04-20'), entryDate: new Date('2026-04-19') }
    expect(tradeOccurredAt(t).getTime()).toBe(t.occurredAt.getTime())
    expect(tradeDate(t).getTime()).toBe(t.occurredAt.getTime())
  })
  it('falls back to exit then entry', () => {
    const a = { entryDate: new Date('2026-01-02'), exitDate: new Date('2026-01-03') }
    expect(tradeDate(a).getTime()).toBe(a.exitDate.getTime())
    const b = { entryDate: new Date('2026-01-02') }
    expect(tradeDate(b).getTime()).toBe(b.entryDate.getTime())
  })
})

describe('tradeOutcome', () => {
  it('classifies breakeven near zero', () => {
    expect(tradeOutcome(0)).toBe('BE')
    expect(tradeOutcome('0')).toBe('BE')
    expect(tradeOutcome(0.002)).toBe('BE')
    expect(tradeOutcome(-0.002)).toBe('BE')
    expect(tradeOutcome(50)).toBe('WIN')
    expect(tradeOutcome(-10)).toBe('LOSS')
  })
})

describe('computeStats', () => {
  it('aggregates closed trades with string netPnl (JSON)', () => {
    const trades = [
      { status: 'CLOSED', netPnl: '100', grossPnl: '105' },
      { status: 'CLOSED', netPnl: '-40', grossPnl: '-35' },
      { status: 'OPEN', netPnl: null },
    ]
    const s = computeStats(trades)
    expect(s.totalTrades).toBe(2)
    expect(s.netPnl).toBe(60)
    expect(s.winners).toBe(1)
    expect(s.losers).toBe(1)
    expect(s.breakevens).toBe(0)
    expect(s.winRate).toBe(50)
  })

  it('counts breakevens and excludes them from win rate denominator', () => {
    const trades = [
      { status: 'CLOSED', netPnl: 100, grossPnl: 100 },
      { status: 'CLOSED', netPnl: 0, grossPnl: 0 },
      { status: 'CLOSED', netPnl: -20, grossPnl: -20 },
    ]
    const s = computeStats(trades)
    expect(s.totalTrades).toBe(3)
    expect(s.winners).toBe(1)
    expect(s.losers).toBe(1)
    expect(s.breakevens).toBe(1)
    expect(s.winRate).toBe(50)
  })
})

describe('buildCalendarData', () => {
  const prevTz = process.env.TRADE_STATS_TZ

  afterEach(() => {
    process.env.TRADE_STATS_TZ = prevTz
  })

  it('buckets by calendar date in TRADE_STATS_TZ (UTC)', () => {
    process.env.TRADE_STATS_TZ = 'UTC'
    const trades = [
      { status: 'CLOSED', netPnl: 10, entryDate: '2026-04-15T12:00:00.000Z', exitDate: null },
      { status: 'CLOSED', netPnl: 5, entryDate: '2026-04-15T12:00:00.000Z', exitDate: '2026-04-16T12:00:00.000Z' },
    ]
    const cal = buildCalendarData(trades)
    expect(cal['2026-04-15'].pnl).toBe(10)
    expect(cal['2026-04-16'].pnl).toBe(5)
  })
})

describe('buildDayOfWeekData', () => {
  const prevTz = process.env.TRADE_STATS_TZ

  afterEach(() => {
    process.env.TRADE_STATS_TZ = prevTz
  })

  it('uses NY calendar day so UTC-late evening still counts as Thursday', () => {
    process.env.TRADE_STATS_TZ = 'America/New_York'
    const trades = [{ status: 'CLOSED', netPnl: 411, exitDate: '2026-05-08T02:30:00.000Z' }]
    const dow = buildDayOfWeekData(trades)
    const thu = dow.find((d) => d.day === 'Thu')
    const fri = dow.find((d) => d.day === 'Fri')
    expect(thu.pnl).toBe(411)
    expect(fri.pnl).toBe(0)
  })
})

describe('resolveTradeStatsTimeZone', () => {
  const prevEnv = process.env.TRADE_STATS_TZ

  afterEach(() => {
    process.env.TRADE_STATS_TZ = prevEnv
  })

  it('uses env when set', () => {
    process.env.TRADE_STATS_TZ = 'UTC'
    expect(resolveTradeStatsTimeZone('America/Los_Angeles')).toBe('UTC')
  })

  it('uses valid client hint when env unset', () => {
    delete process.env.TRADE_STATS_TZ
    expect(resolveTradeStatsTimeZone('America/Los_Angeles')).toBe('America/Los_Angeles')
  })
})

describe('buildEquityCurve', () => {
  it('uses numeric initial balance from string', () => {
    const trades = [{ status: 'CLOSED', netPnl: '25', entryDate: new Date(2026, 0, 1) }]
    const curve = buildEquityCurve(trades, '1000')
    expect(curve).toHaveLength(1)
    expect(curve[0].value).toBe(1025)
  })
})

describe('formatCurrency', () => {
  it('handles decimal-like strings', () => {
    expect(formatCurrency('1234.5')).toContain('1,234.50')
  })
})
