'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import MarketPulse from '@/components/trading/MarketPulse'
import DeskWisdom from '@/components/trading/DeskWisdom'
import StreakHeatmap from '@/components/dashboard/StreakHeatmap'
import ZTScoreRing from '@/components/dashboard/ZTScoreRing'
import DashboardChartTooltip from '@/components/dashboard/DashboardChartTooltip'
import StatCard from '@/components/dashboard/StatCard'
import PnLCalendar from '@/components/dashboard/PnLCalendar'
import BookIcon from '@/components/dashboard/BookIcon'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'
import EdgeInsightBanner from '@/components/dashboard/EdgeInsightBanner'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { formatCurrency, formatDate, toMoneyNumber, tradeStatsTimeZone, tradeOutcome } from '@/lib/utils'
import { TrendingUp, Target, Activity, Plus, ArrowUpRight } from 'lucide-react'

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const tz =
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : ''
    const q = tz ? `?tz=${encodeURIComponent(tz)}` : ''
    fetch(`/api/dashboard${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <DashboardSkeleton />

  const {
    stats = {},
    equityCurve = [],
    dayOfWeek = [],
    calendar = {},
    activityData = null,
    recentTrades = [],
    symbolData = [],
    statsTimeZone: statsTimeZoneFromApi,
  } = data || {}

  const statsTimeZone = statsTimeZoneFromApi || tradeStatsTimeZone()

  return (
    <>
      <div className="page-wrapper">
        <div className="page-header page-header-premium flex items-center justify-between">
          <div className="page-header-text">
            <span className="page-eyebrow">Performance</span>
            <h1 className="page-title-xl">Dashboard</h1>
            <p className="page-subtitle">
              Your edge, distilled — P&amp;L, discipline, and Essence score in one executive view.
            </p>
          </div>
          <div className="page-header-actions">
            <Link href="/journal/new" className="btn btn-primary btn-glow">
              <Plus size={16} /> Log Trade
            </Link>
          </div>
        </div>

        <EdgeInsightBanner stats={stats} />

        <MarketPulse />

        <DeskWisdom />

        <div className="grid-stats" style={{ marginBottom: 24 }}>
          <StatCard
            index={0}
            label="Net P&L"
            value={formatCurrency(stats.netPnl || 0)}
            positive={stats.netPnl >= 0}
            icon={<TrendingUp size={18} />}
            sub={`${stats.totalTrades || 0} closed trades`}
          />
          <StatCard
            index={1}
            label="Win Rate"
            value={`${(stats.winRate || 0).toFixed(1)}%`}
            positive={stats.winRate >= 50}
            icon={<Target size={18} />}
            sub={`${stats.winners || 0}W / ${stats.losers || 0}L${stats.breakevens ? ` / ${stats.breakevens} BE` : ''}`}
          />
          <StatCard
            index={2}
            label="Profit Factor"
            value={(stats.profitFactor || 0).toFixed(2)}
            positive={stats.profitFactor >= 1}
            icon={<Activity size={18} />}
            sub={`Avg win: ${formatCurrency(stats.avgWin || 0)}`}
          />
          <StatCard
            index={3}
            label="Largest Win"
            value={formatCurrency(stats.largestWin || 0)}
            positive
            icon={<ArrowUpRight size={18} />}
            sub={`Largest loss: ${formatCurrency(stats.largestLoss || 0)}`}
          />
          <motion.div
            className="stat-card stat-card--essence essence-score-card"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.45, ease: [0.23, 1, 0.32, 1] }}
          >
            <ZTScoreRing score={stats.ztScore || 0} />
            <div className="essence-score-copy">
              <div className="stat-label">Essence Score</div>
              <p className="essence-score-desc">
                Blend of return quality and consistency. Add closed trades to move off baseline.
              </p>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="grid-2"
          style={{ marginBottom: 24 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="chart-card">
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Equity Curve</div>
                <div className="chart-card-subtitle">Cumulative net P&L over time</div>
              </div>
            </div>
            {equityCurve.length > 1 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={equityCurve}>
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<DashboardChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#D4AF37"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#D4AF37', stroke: '#000', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state-pro" style={{ minHeight: 220, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="empty-icon-wrap">
                  <TrendingUp size={28} strokeWidth={1.75} />
                </div>
                <h3>No equity curve yet</h3>
                <p>Close a few trades and your cumulative P&amp;L line will appear here.</p>
              </div>
            )}
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">P&L by Day of Week</div>
                <div className="chart-card-subtitle">Which days are your best? (Uses your device time zone.)</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dayOfWeek}>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<DashboardChartTooltip />} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false}>
                  {dayOfWeek.map((entry, i) => (
                    <Cell key={i} fill={entry.pnl >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <StreakHeatmap activityData={activityData} />

        <div style={{ marginBottom: 24 }}>
          <PnLCalendar calendar={calendar} statsTimeZone={statsTimeZone} />
        </div>

        <motion.div
          className="grid-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="card">
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <div className="section-title" style={{ margin: 0 }}>
                Recent Trades
              </div>
              <Link href="/journal" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
                View all →
              </Link>
            </div>
            {recentTrades.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentTrades.slice(0, 6).map((trade) => (
                  <Link key={trade.id} href={`/journal/${trade.id}`}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 12px',
                        background: 'var(--bg-surface)',
                        borderRadius: 8,
                        transition: 'var(--transition)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
                    >
                      <span className={trade.side === 'LONG' ? 'side-long' : 'side-short'}>{trade.side}</span>
                      <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{trade.symbol}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(trade.entryDate, 'MMM d')}</span>
                      {trade.netPnl != null && (
                        <span
                          className={
                            tradeOutcome(trade.netPnl) === 'WIN'
                              ? 'pnl-positive'
                              : tradeOutcome(trade.netPnl) === 'LOSS'
                                ? 'pnl-negative'
                                : 'pnl-flat'
                          }
                          style={{ fontSize: 14 }}
                        >
                          {formatCurrency(trade.netPnl)}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state-pro" style={{ padding: '28px 20px', borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="empty-icon-wrap">
                  <BookIcon />
                </div>
                <h3>Your journal is ready</h3>
                <p>Log executions or import a CSV — recent fills will surface here automatically.</p>
                <Link href="/journal/new" className="btn btn-primary btn-sm btn-glow" style={{ marginTop: 8 }}>
                  + Log first trade
                </Link>
              </div>
            )}
          </div>

          <div className="card">
            <div className="section-title">Top Symbols by P&L</div>
            {symbolData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {symbolData.slice(0, 6).map((s, i) => (
                  <div key={s.symbol} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: 'var(--bg-elevated)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{s.symbol}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.count} trades</span>
                    <span className={s.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'} style={{ fontSize: 14 }}>
                      {formatCurrency(s.pnl)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-pro" style={{ padding: '28px 20px', borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="empty-icon-wrap">
                  <Activity size={28} />
                </div>
                <h3>Symbol leaderboard</h3>
                <p>Once you have closed trades, your best and worst symbols rank here.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  )
}
