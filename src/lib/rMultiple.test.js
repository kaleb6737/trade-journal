import { buildRStats, formatR, normalizeR, parseR, suggestR } from './rMultiple'

describe('parseR / normalizeR', () => {
  it('parses "2", "-1.5", "2R" and blanks', () => {
    expect(parseR('2')).toBe(2)
    expect(parseR('-1.5')).toBe(-1.5)
    expect(parseR('2R')).toBe(2)
    expect(parseR('')).toBeNull()
    expect(parseR('abc')).toBeNull()
  })

  it('signs R from the P&L so "1" on a losing trade means -1R', () => {
    expect(normalizeR('1', -250)).toBe(-1)
    expect(normalizeR('-2', 700)).toBe(2)
    expect(normalizeR('0', 0)).toBe(0)
    expect(normalizeR('0.1', 0)).toBe(0.1)
    expect(normalizeR('1.5', null)).toBe(1.5)
  })
})

describe('suggestR', () => {
  it('computes R from entry, stop and exit for longs and shorts', () => {
    expect(suggestR({ side: 'LONG', entryPrice: 100, stopLoss: 98, exitPrice: 104 })).toBe(2)
    expect(suggestR({ side: 'SHORT', entryPrice: 100, stopLoss: 101, exitPrice: 101 })).toBe(-1)
  })

  it('refuses a stop on the wrong side or missing prices', () => {
    expect(suggestR({ side: 'SHORT', entryPrice: 4369.1, stopLoss: 4362, exitPrice: 4362 })).toBeNull()
    expect(suggestR({ side: 'LONG', entryPrice: 100, stopLoss: '', exitPrice: 104 })).toBeNull()
  })
})

describe('buildRStats', () => {
  const t = (r, day, extra = {}) => ({ status: 'CLOSED', rMultiple: r, occurredAt: `2026-09-${day}T15:00:00Z`, symbol: 'MGC', side: 'LONG', ...extra })
  const trades = [
    t('-1', '21'), t('-1', '22'), t('2.5', '23'), t(null, '24'), t('1', '25', { playbookId: 'sb' }),
    { status: 'OPEN', rMultiple: '3', occurredAt: '2026-09-26T15:00:00Z' },
  ]
  const s = buildRStats(trades, { playbookName: (id) => (id === 'sb' ? 'Silver Bullet' : null) })

  it('totals, averages and expectancy in R (closed trades only)', () => {
    expect(s).toMatchObject({ count: 4, totalR: 1.5, avgR: 0.38, winRate: 50, avgWinR: 1.75, avgLossR: -1, profitFactorR: 1.75, bestR: 2.5, worstR: -1 })
  })

  it('reports how many closed trades are missing R', () => {
    expect(s).toMatchObject({ closedTrades: 5, missing: 1, coverage: 80 })
  })

  it('tracks the cumulative R curve, drawdown and worst losing run', () => {
    expect(s.curve.map((p) => p.cumR)).toEqual([-1, -2, 0.5, 1.5])
    expect(s.maxDrawdownR).toBe(-2)
    expect(s.worstLosingStreakR).toBe(-2)
  })

  it('buckets the distribution and groups by playbook', () => {
    expect(s.distribution.find((b) => b.bucket === '−2 to −1R').count).toBe(2)
    expect(s.distribution.find((b) => b.bucket === '2 to 3R').count).toBe(1)
    expect(s.byPlaybook.find((g) => g.name === 'Silver Bullet')).toMatchObject({ count: 1, totalR: 1 })
  })

  it('formats R values', () => {
    expect(formatR(2)).toBe('+2.00R')
    expect(formatR(-1)).toBe('-1.00R')
    expect(formatR(null)).toBe('—')
  })
})
