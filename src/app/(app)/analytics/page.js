'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts'
import { formatCurrency, formatPercent, computeStats, buildEquityCurve, buildDayOfWeekData, buildSessionData, buildSymbolData, buildPlaybookStats, ASSET_COLORS, parseTags, tradeDate, toMoneyNumber, tradeOutcome } from '@/lib/utils'
import { tradesForAggregations } from '@/lib/tradePrivacy'
import { TrendingUp, TrendingDown, Activity, Target, Award, BookOpen } from 'lucide-react'
import RAnalytics, { RSummaryStrip } from '@/components/analytics/RAnalytics'
import { buildRStats } from '@/lib/rMultiple'
import EdgeLab from '@/components/analytics/EdgeLab'
import { filterAnalyticsTrades } from '@/lib/edgeAnalytics'
import edgeStyles from '@/components/analytics/EdgeLab.module.css'

const CHART_COLORS = ['#E8C66A', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#06B6D4']

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => {
        const v = toMoneyNumber(p.value) ?? 0
        return (
          <div key={i} style={{ color: v >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
            {formatCurrency(p.value)}
          </div>
        )
      })}
    </div>
  )
}

function PlaybookWinRateTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '12px 14px', fontSize: 13, minWidth: 200 }}>
      <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{d.fullName}</div>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Win rate <strong style={{ color: 'var(--gold-primary)' }}>{d.winRate.toFixed(1)}%</strong></div>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{d.count} closed · W {d.wins} / L {d.losses}{d.breakevens ? ` / ${d.breakevens} BE` : ''}</div>
      <div style={{ color: (toMoneyNumber(d.netPnl) ?? 0) >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>Net {formatCurrency(d.netPnl)}</div>
      <div style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 12 }}>Expectancy {formatCurrency(d.expectancy)} · PF {d.profitFactor >= 99 ? '∞' : d.profitFactor.toFixed(2)} · Edge {d.edgeScore}</div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [allTrades, setTrades] = useState([])
  const [accounts, setAccounts] = useState([])
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [filters, setFilters] = useState({ from: '', to: '', symbol: '', side: '', playbook: '', account: '' })
  const trades = useMemo(() => filterAnalyticsTrades(allTrades, filters), [allTrades, filters])
  const setFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }))
  const [playbooks, setPlaybooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('edge')

  useEffect(() => {
    const controller = new AbortController()
    const read = async (url) => {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) throw new Error(response.status === 401 ? 'Your session expired. Sign in again to load analytics.' : 'Analytics could not be loaded. Please retry.')
      return response.json()
    }
    const loadTrades = async () => {
      let rows = [], offset = 0
      while (true) {
        const page = await read(`/api/trades?limit=1000&offset=${offset}`)
        if (!Array.isArray(page.trades) || !Number.isFinite(page.total)) throw new Error('Unexpected trade response. Please retry.')
        rows.push(...page.trades)
        offset += page.trades.length
        if (offset >= page.total) break
        if (!page.trades.length) throw new Error('Incomplete trade history. Please retry.')
      }
      return [...new Map(rows.map(t => [t.id, t])).values()]
    }
    setLoading(true)
    setError('')
    Promise.all([loadTrades(), read('/api/playbooks'), read('/api/accounts')])
      .then(([td, pd, ad]) => {
        if (controller.signal.aborted) return
        setTrades(tradesForAggregations(td))
        setPlaybooks(pd.playbooks || [])
        setAccounts(ad.accounts || [])
      })
      .catch(err => { if (!controller.signal.aborted) setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])

  const closed = trades.filter(t => t.status === 'CLOSED' && t.netPnl != null && toMoneyNumber(t.netPnl) != null)
  const stats = computeStats(trades)
  const equityCurve = buildEquityCurve(trades)
  const dayOfWeek = buildDayOfWeekData(trades)
  const sessionData = buildSessionData(trades)
  const symbolData = buildSymbolData(trades)
  const rStats = buildRStats(trades, { playbookName: (id) => playbooks.find((p) => p.id === id)?.name })

  // Asset type breakdown
  const assetBreakdown = Object.entries(
    closed.reduce((acc, t) => { acc[t.assetType] = (acc[t.assetType] || 0) + 1; return acc }, {})
  ).map(([name, value]) => ({ name, value }))

  // Win/loss by side
  const sideData = ['LONG', 'SHORT'].map(side => {
    const sideTrades = closed.filter(t => t.side === side)
    const wins = sideTrades.filter(t => tradeOutcome(t.netPnl) === 'WIN').length
    const losses = sideTrades.filter(t => tradeOutcome(t.netPnl) === 'LOSS').length
    const breakevens = sideTrades.filter(t => tradeOutcome(t.netPnl) === 'BE').length
    const decided = wins + losses
    const pnl  = sideTrades.reduce((s, t) => s + (toMoneyNumber(t.netPnl) ?? 0), 0)
    return { side, count: sideTrades.length, wins, losses, breakevens, winRate: decided ? (wins / decided * 100).toFixed(1) : '0.0', pnl }
  })

  // Monthly P&L
  const monthlyMap = {}
  closed.forEach(t => {
    const when = tradeDate(t)
    if (!when) return
    const key = new Date(when).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, pnl: 0, count: 0 }
    monthlyMap[key].pnl += toMoneyNumber(t.netPnl) ?? 0
    monthlyMap[key].count += 1
  })
  const monthlyData = Object.values(monthlyMap)

  // Most used tags
  const tagMap = {}
  closed.forEach(t => { parseTags(t.tags).forEach(tag => { tagMap[tag] = (tagMap[tag] || 0) + 1 }) })
  const topTags = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }))

  // Streak
  let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0
  const sorted = [...closed]
    .filter(t => tradeDate(t))
    .sort((a, b) => new Date(tradeDate(a)) - new Date(tradeDate(b)))
  sorted.forEach(t => {
    const o = tradeOutcome(t.netPnl)
    if (o === 'WIN') { curWin++; curLoss = 0; maxWinStreak = Math.max(maxWinStreak, curWin) }
    else if (o === 'LOSS') { curLoss++; curWin = 0; maxLossStreak = Math.max(maxLossStreak, curLoss) }
    else { curWin = 0; curLoss = 0 }
  })

  const playbookRows = buildPlaybookStats(trades, playbooks)
  const profitablePB = playbookRows.filter((r) => (toMoneyNumber(r.netPnl) ?? 0) > 0).sort((a, b) => (toMoneyNumber(b.netPnl) ?? 0) - (toMoneyNumber(a.netPnl) ?? 0))
  const unprofitablePB = playbookRows.filter((r) => (toMoneyNumber(r.netPnl) ?? 0) < 0).sort((a, b) => (toMoneyNumber(a.netPnl) ?? 0) - (toMoneyNumber(b.netPnl) ?? 0))
  const flatPB = playbookRows.filter((r) => (toMoneyNumber(r.netPnl) ?? 0) === 0)
  const sumProfitablePnl = profitablePB.reduce((s, r) => s + (toMoneyNumber(r.netPnl) ?? 0), 0)
  const sumUnprofitablePnl = unprofitablePB.reduce((s, r) => s + (toMoneyNumber(r.netPnl) ?? 0), 0)
  const tradesInWinningPB = profitablePB.reduce((s, r) => s + r.count, 0)
  const tradesInLosingPB = unprofitablePB.reduce((s, r) => s + r.count, 0)

  const playbookChartData = [...playbookRows]
    .filter((r) => r.count > 0)
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 12)
    .map((r) => ({
      name: r.name.length > 15 ? `${r.name.slice(0, 15)}…` : r.name,
      fullName: r.name,
      winRate: +r.winRate.toFixed(1),
      count: r.count,
      wins: r.wins,
      losses: r.losses,
      breakevens: r.breakevens,
      netPnl: r.netPnl,
      expectancy: r.expectancy,
      profitFactor: r.profitFactor,
      edgeScore: r.edgeScore,
      color: r.color,
    }))

  const playbookPieData = []
  if (tradesInWinningPB > 0) playbookPieData.push({ name: 'Trades in net + playbooks', value: tradesInWinningPB, fill: 'rgba(34, 197, 94, 0.85)' })
  if (tradesInLosingPB > 0) playbookPieData.push({ name: 'Trades in net − playbooks', value: tradesInLosingPB, fill: 'rgba(239, 68, 68, 0.8)' })
  const flatTrades = flatPB.reduce((s, r) => s + r.count, 0)
  if (flatTrades > 0) playbookPieData.push({ name: 'Trades in flat playbooks', value: flatTrades, fill: 'rgba(148, 163, 184, 0.75)' })

  const TABS = [
    { id: 'edge', label: 'Edge Lab' },
    { id: 'r', label: 'R-Multiple' },
    { id: 'overview', label: 'Overview' },
    { id: 'performance', label: 'Performance' },
    { id: 'symbols', label: 'Symbols' },
    { id: 'playbooks', label: 'Playbooks' },
    { id: 'timing', label: 'Timing' },
  ]

  if (loading) return (
    <>
      <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <div className="empty-state-pro" style={{ border: 'none', background: 'transparent' }}>
          <div className="empty-icon-wrap" style={{ width: 56, height: 56 }}>
            <div className="spinner" style={{ width: 26, height: 26, borderWidth: 2 }} />
          </div>
          <h3 style={{ margin: 0 }}>Loading analytics</h3>
          <p style={{ margin: 0 }}>Aggregating your performance…</p>
        </div>
      </div>
    </>
  )

  return (
    <>
      <div className="page-wrapper">
        <div className="page-header page-header-premium">
          <div className="page-header-text">
            <span className="page-eyebrow">Intelligence</span>
            <h1 className="page-title-xl">Analytics</h1>
            <p className="page-subtitle">Your trading research desk. Measure in R, investigate the conditions, and put your edge to the test.</p>
          </div>
        </div>

        {error ? <div className={edgeStyles.error} role="alert"><p>{error}</p><button className={edgeStyles.button} onClick={() => setReload(n => n + 1)}>Retry analytics</button></div> : null}
        <div className={edgeStyles.filters} aria-label="Analytics filters">
          <label>From<input type="date" value={filters.from} max={filters.to || undefined} onChange={e => setFilter('from', e.target.value)} /></label>
          <label>Through<input type="date" value={filters.to} min={filters.from || undefined} onChange={e => setFilter('to', e.target.value)} /></label>
          <label>Account<select value={filters.account} onChange={e => setFilter('account', e.target.value)}><option value="">All accounts</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <label>Symbol<select value={filters.symbol} onChange={e => setFilter('symbol', e.target.value)}><option value="">All symbols</option>{[...new Set(allTrades.map(t => t.symbol))].sort().map(symbol => <option key={symbol}>{symbol}</option>)}</select></label>
          <label>Direction<select value={filters.side} onChange={e => setFilter('side', e.target.value)}><option value="">Both directions</option><option value="LONG">Long</option><option value="SHORT">Short</option></select></label>
          <label>Playbook<select value={filters.playbook} onChange={e => setFilter('playbook', e.target.value)}><option value="">All playbooks</option>{playbooks.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <button className={edgeStyles.button} onClick={() => setFilters({ from: '', to: '', symbol: '', side: '', playbook: '', account: '' })}>Reset</button>
          <div className={edgeStyles.filterMeta}><span>{trades.length} of {allTrades.length} visible trades · filters apply to every view</span><span>Local dates · closed trades drive performance</span></div>
          {filters.from && filters.to && filters.from > filters.to ? <p role="alert">The start date must be on or before the end date.</p> : null}
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 28, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active gold' : ''}`} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          >
        {tab === 'edge' && !error && <EdgeLab trades={trades} playbooks={playbooks} />}
        {tab === 'r' && <RAnalytics r={rStats} />}

        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <RSummaryStrip r={rStats} onOpen={() => setTab('r')} />

            {/* Summary Cards */}
            <div className="grid-stats">
              {[
                { label: 'Total Trades', value: stats.totalTrades, icon: <Activity size={18} /> },
                { label: 'Win Rate', value: `${stats.winRate?.toFixed(1)}%`, icon: <Target size={18} /> },
                { label: 'Net P&L', value: formatCurrency(stats.netPnl), color: stats.netPnl >= 0 ? 'var(--green)' : 'var(--red)', icon: <TrendingUp size={18} /> },
                { label: 'Profit Factor', value: stats.profitFactor?.toFixed(2), icon: <Award size={18} /> },
                { label: 'Avg Win', value: formatCurrency(stats.avgWin), color: 'var(--green)', icon: <TrendingUp size={18} /> },
                { label: 'Avg Loss', value: formatCurrency(-stats.avgLoss), color: 'var(--red)', icon: <TrendingDown size={18} /> },
                { label: 'Max Win Streak', value: maxWinStreak, icon: <Award size={18} /> },
                { label: 'Max Loss Streak', value: maxLossStreak, color: 'var(--red)', icon: <Activity size={18} /> },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-icon">{s.icon}</div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ color: s.color || 'var(--text-primary)' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Side Performance */}
            <div className="grid-2">
              {sideData.map(s => (
                <div key={s.side} className="card">
                  <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                    <div className="section-title" style={{ margin: 0 }}>{s.side} Trades</div>
                    <span className={s.side === 'LONG' ? 'side-long' : 'side-short'}>{s.side}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 16 }}>
                    <div><div className="stat-label">Total</div><div className="stat-value">{s.count}</div></div>
                    <div><div className="stat-label">Win Rate</div><div className="stat-value">{s.winRate}%</div></div>
                    <div><div className="stat-label">P&L</div>
                      <div className="stat-value" style={{ color: s.pnl >= 0 ? 'var(--green)' : 'var(--red)', fontSize: '1.1rem' }}>{formatCurrency(s.pnl)}</div>
                    </div>
                    <div><div className="stat-label">Wins</div><div className="stat-value">{s.wins}</div></div>
                    <div><div className="stat-label">Losses</div><div className="stat-value">{s.losses}</div></div>
                    {s.breakevens > 0 && <div><div className="stat-label">BE</div><div className="stat-value" style={{ color: 'var(--gold-primary)' }}>{s.breakevens}</div></div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Asset Breakdown Pie */}
            {assetBreakdown.length > 0 && (
              <div className="chart-card">
                <div className="chart-card-title" style={{ marginBottom: 20 }}>Trades by Asset Type</div>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={assetBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {assetBreakdown.map((entry, i) => (
                        <Cell key={i} fill={ASSET_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {tab === 'performance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="chart-card">
              <div className="chart-card-title">Equity Curve</div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={equityCurve}>
                  <defs>
                    <linearGradient id="areaGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E8C66A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#E8C66A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" stroke="#E8C66A" strokeWidth={2.5} fill="url(#areaGold)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-card-title">Monthly P&L</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData}>
                  <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {monthlyData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22C55E' : '#EF4444'} opacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === 'symbols' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="chart-card">
              <div className="chart-card-title" style={{ marginBottom: 20 }}>P&L by Symbol</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={symbolData.slice(0, 15)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <YAxis dataKey="symbol" type="category" tick={{ fontSize: 12, fill: 'var(--text-primary)', fontWeight: 600 }} width={60} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                    {symbolData.slice(0, 15).map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22C55E' : '#EF4444'} opacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Tags */}
            {topTags.length > 0 && (
              <div className="card">
                <div className="section-title">Most Used Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {topTags.map(t => (
                    <div key={t.name} className="badge badge-gold" style={{ fontSize: 13, padding: '6px 14px' }}>
                      {t.name} <span style={{ opacity: 0.7, marginLeft: 4 }}>({t.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'playbooks' && closed.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="chart-card" style={{ borderColor: 'rgba(232, 198, 106, 0.2)', background: 'linear-gradient(180deg, rgba(232, 198, 106, 0.04) 0%, var(--bg-card) 45%)' }}>
              <div className="flex items-center gap-3" style={{ marginBottom: 8 }}>
                <div className="empty-icon-wrap" style={{ width: 44, height: 44, borderRadius: 12 }}>
                  <BookOpen size={22} strokeWidth={2} />
                </div>
                <div>
                  <div className="chart-card-title" style={{ marginBottom: 4 }}>Playbook edge</div>
                  <div className="chart-card-subtitle">Win rate, expectancy ($/trade), profit factor, and a 0–100 edge score per playbook — plus what is printing vs bleeding.</div>
                </div>
              </div>
            </div>

            <div className="analytics-pb-split">
              <div className="analytics-pb-pillar analytics-pb-pillar--win">
                <div className="analytics-pb-pillar-label">
                  <TrendingUp size={16} aria-hidden />
                  Profitable playbooks
                </div>
                <div className="analytics-pb-pillar-stat">{profitablePB.length}</div>
                <div className="analytics-pb-pillar-sub">
                  Combined net <span style={{ color: 'var(--green)', fontWeight: 800 }}>{formatCurrency(sumProfitablePnl)}</span>
                  {' · '}{tradesInWinningPB} trades
                </div>
                <div className="analytics-pb-pillar-list">
                  {profitablePB.length === 0 && <div className="analytics-pb-pillar-sub">None yet — tag trades to a playbook and close them to see green here.</div>}
                  {profitablePB.slice(0, 6).map((r) => (
                    <div key={r.playbookId || r.name} className="analytics-pb-chip">
                      <span className="analytics-pb-chip-dot" style={{ background: r.color }} />
                      <span className="analytics-pb-chip-name">{r.name}</span>
                      <span className="analytics-pb-chip-pnl" style={{ color: 'var(--green)' }}>{formatCurrency(r.netPnl)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="analytics-pb-pillar analytics-pb-pillar--loss">
                <div className="analytics-pb-pillar-label">
                  <TrendingDown size={16} aria-hidden />
                  Unprofitable playbooks
                </div>
                <div className="analytics-pb-pillar-stat">{unprofitablePB.length}</div>
                <div className="analytics-pb-pillar-sub">
                  Combined net <span style={{ color: 'var(--red)', fontWeight: 800 }}>{formatCurrency(sumUnprofitablePnl)}</span>
                  {' · '}{tradesInLosingPB} trades
                </div>
                <div className="analytics-pb-pillar-list">
                  {unprofitablePB.length === 0 && <div className="analytics-pb-pillar-sub">No net-negative buckets — or you have not closed enough tagged trades.</div>}
                  {unprofitablePB.slice(0, 6).map((r) => (
                    <div key={r.playbookId || r.name} className="analytics-pb-chip">
                      <span className="analytics-pb-chip-dot" style={{ background: r.color }} />
                      <span className="analytics-pb-chip-name">{r.name}</span>
                      <span className="analytics-pb-chip-pnl" style={{ color: 'var(--red)' }}>{formatCurrency(r.netPnl)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {playbookPieData.length > 0 && (
              <div className="grid-2">
                <div className="chart-card">
                  <div className="chart-card-title" style={{ marginBottom: 8 }}>Where your closed trades live</div>
                  <div className="chart-card-subtitle" style={{ marginBottom: 16 }}>By net P&amp;L bucket of the playbook (not individual trade outcome).</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={playbookPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={56} outerRadius={88} paddingAngle={2}>
                        {playbookPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} stroke="var(--bg-card)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <div className="chart-card-title" style={{ marginBottom: 8 }}>Win rate by playbook</div>
                  <div className="chart-card-subtitle" style={{ marginBottom: 16 }}>Sorted high → low. Bar color = playbook accent.</div>
                  {playbookChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={playbookChartData} layout="vertical" margin={{ left: 4, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" width={88} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<PlaybookWinRateTooltip />} />
                        <Bar dataKey="winRate" radius={[0, 6, 6, 0]} maxBarSize={18}>
                          {playbookChartData.map((e, i) => (
                            <Cell key={i} fill={e.color} fillOpacity={0.88} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-state-pro" style={{ minHeight: 200, borderStyle: 'solid' }}>
                      <p style={{ margin: 0, color: 'var(--text-muted)' }}>No playbook-tagged closed trades yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="section-title" style={{ marginBottom: 16 }}>Playbook breakdown</div>
              <div className="analytics-pb-grid">
                {[...playbookRows].sort((a, b) => Math.abs(toMoneyNumber(b.netPnl) ?? 0) - Math.abs(toMoneyNumber(a.netPnl) ?? 0)).map((r) => {
                  const edgeStyle =
                    r.edgeScore >= 68
                      ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.35)', color: '#4ade80' }
                      : r.edgeScore >= 42
                        ? { background: 'var(--gold-glow)', border: '1px solid var(--gold-border)', color: 'var(--gold-primary)' }
                        : { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }
                  return (
                    <article key={r.playbookId || `none-${r.name}`} className="analytics-pb-card" style={{ ['--pb-accent']: r.color }}>
                      <div className="analytics-pb-card-head">
                        <div className="analytics-pb-card-title">{r.name}</div>
                        <span className="analytics-pb-edge-badge" style={edgeStyle}>Edge {r.edgeScore}</span>
                      </div>
                      <div className="analytics-pb-metrics">
                        <div>
                          <div className="analytics-pb-metric-label">Win rate</div>
                          <div className="analytics-pb-metric-value">{r.winRate.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="analytics-pb-metric-label">Trades</div>
                          <div className="analytics-pb-metric-value">{r.count}</div>
                        </div>
                        <div>
                          <div className="analytics-pb-metric-label">Expectancy</div>
                          <div className="analytics-pb-metric-value" style={{ color: r.expectancy >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(r.expectancy)}</div>
                        </div>
                        <div>
                          <div className="analytics-pb-metric-label">Profit factor</div>
                          <div className="analytics-pb-metric-value">{r.profitFactor >= 99 ? '∞' : r.profitFactor.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="analytics-pb-metric-label">Net P&amp;L</div>
                          <div className="analytics-pb-metric-value" style={{ color: (toMoneyNumber(r.netPnl) ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(r.netPnl)}</div>
                        </div>
                        <div>
                          <div className="analytics-pb-metric-label">W / L</div>
                          <div className="analytics-pb-metric-value">{r.wins} / {r.losses}{r.breakevens ? ` / ${r.breakevens} BE` : ''}</div>
                        </div>
                      </div>
                      <div className="analytics-pb-winrate-bar">
                        <div className="analytics-pb-winrate-fill" style={{ width: `${Math.min(100, r.winRate)}%`, background: r.color }} />
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'playbooks' && closed.length === 0 && (
          <div className="empty-state-pro" style={{ maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
            <div className="empty-icon-wrap"><BookOpen size={28} /></div>
            <h3>Playbook analytics need closed trades</h3>
            <p>Assign a playbook when you log trades, then close them — we will rank win rate, expectancy, and edge by setup.</p>
          </div>
        )}

        {tab === 'timing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="chart-card">
              <div className="chart-card-title">P&L by Day of Week</div>
              <div className="chart-card-subtitle" style={{ marginBottom: 20 }}>Which days are most profitable?</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dayOfWeek}>
                  <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pnl" radius={[5, 5, 0, 0]} maxBarSize={48} isAnimationActive={false}>
                    {dayOfWeek.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22C55E' : '#EF4444'} opacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid-stats">
              {dayOfWeek.filter(d => d.count > 0).map(d => (
                <div key={d.day} className="stat-card">
                  <div className="stat-label">{d.day}</div>
                  <div className="stat-value" style={{ fontSize: '1.1rem', color: d.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {formatCurrency(d.pnl)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{d.count} trades</div>
                </div>
              ))}
            </div>

            {sessionData.length > 0 && (
              <>
                <div className="chart-card" style={{ marginTop: 16 }}>
                  <div className="chart-card-title">P&L by Trade Session</div>
                  <div className="chart-card-subtitle" style={{ marginBottom: 20 }}>Profitability breakdown across different market sessions.</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={sessionData}>
                      <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="session" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="pnl" radius={[5, 5, 0, 0]} maxBarSize={60}>
                        {sessionData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#3B82F6' : '#EF4444'} opacity={0.8} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid-stats">
                  {sessionData.map(d => (
                    <div key={d.session} className="stat-card">
                      <div className="stat-label">{d.session}</div>
                      <div className="stat-value" style={{ fontSize: '1.1rem', color: d.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {formatCurrency(d.pnl)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{d.count} trades</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {closed.length === 0 && (
          <div className="empty-state-pro" style={{ marginTop: 48, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
            <div className="empty-icon-wrap"><Activity size={30} /></div>
            <h3>Analytics unlock with data</h3>
            <p>Close a few trades in your journal — we will chart equity curves, streaks, and symbol quality automatically.</p>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  )
}
