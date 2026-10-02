import { describe, it, expect } from 'vitest'
import { eligibleRTrades, summarizeEdge, bootstrapMean, buildEdgeAnalytics, simulateR, filterAnalyticsTrades } from './edgeAnalytics'
const trade = (r, i = 0, extra = {}) => ({ id: String(i), status: 'CLOSED', rMultiple: r, entryDate: new Date(2026, 0, i + 1, 10).toISOString(), symbol: 'ES', side: 'LONG', ...extra })
describe('R research statistics', () => {
  it('includes breakevens in expectancy and anchors drawdown at zero', () => {
    const s = summarizeEdge([-1, -1, 3, 0, -2])
    expect(s.avg).toBe(-.2); expect(s.drawdown).toBe(-2); expect(s.currentDrawdown).toBe(-2)
    expect(s.longestRecovery).toBe(2); expect(s.maxLossStreak).toBe(2)
    expect(s.winRate).toBe(20); expect(s.decidedWinRate).toBe(25); expect(s.profitFactor).toBe(.75)
    expect(s.withoutBest).toBe(-1); expect(s.breakevens).toBe(1)
  })
  it('handles empty, all-winning, all-losing and flat samples honestly', () => {
    expect(summarizeEdge([]).avg).toBeNull(); expect(summarizeEdge([]).tailLoss).toBeNull()
    expect(summarizeEdge([1, 2]).profitFactor).toBe(Infinity)
    expect(summarizeEdge([-1, -2]).profitFactor).toBe(0)
    expect(summarizeEdge([0, 0]).profitFactor).toBeNull()
    expect(summarizeEdge([-1, -2]).drawdown).toBe(-3)
    expect(summarizeEdge([2]).withoutBest).toBeNull()
  })
  it('excludes hidden, open, missing R and invalid dates while retaining 0R', () => {
    const rows = [trade(0), trade(null, 1), trade(3, 2, { hidden: true }), trade(4, 3, { status: 'OPEN' }), trade(2, 4, { entryDate: 'bad' }), trade('2.5', 5)]
    expect(eligibleRTrades(rows).map(t => t.id)).toEqual(['0', '5'])
    const edge = buildEdgeAnalytics(rows)
    expect(edge.closed).toBe(4); expect(edge.stats.n).toBe(2)
  })
  it('uses realized chronology, full rolling windows and nonoverlapping halves', () => {
    const rows = [trade(2, 2), trade(-1, 0), trade(3, 1)]
    const e = buildEdgeAnalytics(rows, { window: 2 })
    expect(e.values).toEqual([-1, 3, 2]); expect(e.curve[1].rolling).toBeNull()
    expect(e.curve[2].rolling).toBe(1); expect(e.curve[3].rolling).toBe(2.5)
    expect(e.first.n).toBe(1); expect(e.second.n).toBe(2)
  })
  it('safely groups arbitrary labels and deduplicates overlapping tags', () => {
    const e = buildEdgeAnalytics([trade(2, 0, { tags: '["__proto__","A","A"]' }), trade(-1, 1, { tags: 'broken' })], { dimension: 'tags', minSample: 5 })
    expect(e.rows.find(r => r.name === '__proto__').total).toBe(2)
    expect(e.rows.find(r => r.name === 'A').n).toBe(1)
    expect(e.rows.find(r => r.name === 'Untagged').avg).toBe(-1)
    expect(e.rows.every(r => !r.qualified)).toBe(true)
  })
  it('bootstraps reproducibly and refuses tiny samples', () => {
    expect(bootstrapMean([1, 2])).toBeNull()
    expect(bootstrapMean([2, 2, 2, 2, 2])).toEqual({ low: 2, high: 2 })
    expect(bootstrapMean([-1, 0, 1, 2, 3])).toEqual(bootstrapMean([-1, 0, 1, 2, 3]))
  })
  it('simulates known constant paths with friction and drawdown', () => {
    const s = simulateR([1, 1, 1, 1, 1], { horizon: 25, cost: .2 })
    expect(s.end.median).toBeCloseTo(20); expect(s.lossChance).toBe(0); expect(s.drawdown95).toBe(0)
    const loss = simulateR([-1, -1, -1, -1, -1], { horizon: 25 })
    expect(loss.end.band).toEqual([-25, -25]); expect(loss.lossChance).toBe(100); expect(loss.drawdown95).toBe(25)
    expect(simulateR([1])).toBeNull()
  })
  it('reproduces seeded paths and respects quantile order', () => {
    const values = [-1, 0, 1, 2, 4]
    const s = simulateR(values)
    expect(s).toEqual(simulateR(values))
    expect(s.curve.every(p => p.band[0] <= p.median && p.median <= p.band[1])).toBe(true)
    expect(simulateR(values, { seed: 9 }).end).not.toEqual(s.end)
  })
  it('filters by inclusive local realization date and combines dimensions', () => {
    const rows = [trade(1, 0, { occurredAt: new Date(2026, 0, 5, 23).toISOString(), accountId: 'a' }), trade(2, 1, { side: 'SHORT' })]
    expect(filterAnalyticsTrades(rows, { from: '2026-01-05', to: '2026-01-05', account: 'a', side: 'LONG' })).toEqual([rows[0]])
    expect(filterAnalyticsTrades(rows, { from: '2026-02-01', to: '2026-01-01' })).toEqual([])
  })
})
