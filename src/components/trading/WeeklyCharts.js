'use client'

import { formatCurrency } from '@/lib/utils'
import { TrendingUp, BarChart2, Calendar, Brain } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell,
} from 'recharts'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function ChartCard({ icon: Icon, iconColor, title, subtitle, children }) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Icon size={15} style={{ color: iconColor || 'var(--gold-primary)' }} />
        <h3 style={{ margin: 0, fontFamily: 'Space Grotesk', fontSize: '0.9rem' }}>{title}</h3>
        {subtitle && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  )
}

const tipStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13 }

export default function WeeklyCharts({ trades }) {
  if (!trades.length) return null

  // Equity curve
  let cum = 0
  const equity = trades
    .slice()
    .sort((a, b) => new Date(a.occurredAt || a.exitDate || a.entryDate) - new Date(b.occurredAt || b.exitDate || b.entryDate))
    .map((t, i) => {
      cum += parseFloat(t.netPnl) || 0
      return { trade: i + 1, symbol: t.symbol, cumPnl: parseFloat(cum.toFixed(2)) }
    })

  const finalPnl   = equity[equity.length - 1]?.cumPnl ?? 0
  const equityColor = finalPnl >= 0 ? '#22c55e' : '#ef4444'
  const gradId      = finalPnl >= 0 ? 'pnlGradPos' : 'pnlGradNeg'

  // P&L by symbol
  const symMap = {}
  trades.forEach(t => { symMap[t.symbol] = (symMap[t.symbol] || 0) + (parseFloat(t.netPnl) || 0) })
  const symbolData = Object.entries(symMap)
    .map(([symbol, pnl]) => ({ symbol, pnl: parseFloat(pnl.toFixed(2)) }))
    .sort((a, b) => b.pnl - a.pnl)

  // P&L by day
  const dayMap = {}
  trades.forEach(t => {
    const when = t.occurredAt || t.exitDate || t.entryDate
    if (!when) return
    const d = new Date(when)
    const key = DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]
    dayMap[key] = (dayMap[key] || 0) + (parseFloat(t.netPnl) || 0)
  })
  const dayData = DAYS.filter(d => d in dayMap).map(d => ({ day: d, pnl: parseFloat((dayMap[d]).toFixed(2)) }))

  // Emotion trend
  const emoData = trades
    .filter(t => t.emotionScore)
    .map((t, i) => ({ trade: i + 1, symbol: t.symbol, score: t.emotionScore, pnl: parseFloat(t.netPnl) || 0 }))

  return (
    <>
      {/* Equity curve */}
      <ChartCard icon={TrendingUp} title="Equity Curve" subtitle="cumulative P&L trade by trade">
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={equity} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={equityColor} stopOpacity={0.28} />
                <stop offset="95%" stopColor={equityColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
            <XAxis dataKey="trade" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} label={{ value: 'Trade #', position: 'insideBottom', offset: -2, fill: 'var(--text-muted)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
            <Tooltip formatter={(v, _, p) => [formatCurrency(v), `After ${p.payload.symbol}`]} contentStyle={tipStyle} />
            <ReferenceLine y={0} stroke="var(--border-default)" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="cumPnl" stroke={equityColor} strokeWidth={2.5} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 5, fill: equityColor }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Symbol + Day side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 12 }}>
        {symbolData.length > 0 && (
          <ChartCard icon={BarChart2} title="P&L by Symbol">
            <ResponsiveContainer width="100%" height={Math.max(140, symbolData.length * 36)}>
              <BarChart data={symbolData} layout="vertical" margin={{ top: 0, right: 10, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="symbol" tick={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }} tickLine={false} axisLine={false} width={52} />
                <Tooltip formatter={v => [formatCurrency(v), 'Net P&L']} contentStyle={tipStyle} />
                <ReferenceLine x={0} stroke="var(--border-default)" />
                <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                  {symbolData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {dayData.length > 0 && (
          <ChartCard icon={Calendar} title="P&L by Day">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={v => [formatCurrency(v), 'Net P&L']} contentStyle={tipStyle} />
                <ReferenceLine y={0} stroke="var(--border-default)" strokeDasharray="4 4" />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {dayData.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Emotion trend */}
      {emoData.length > 1 && (
        <ChartCard icon={Brain} iconColor="#a855f7" title="Emotion Score Trend" subtitle="1 = out of control · 5 = fully focused">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={emoData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="emoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
              <XAxis dataKey="trade" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} label={{ value: 'Trade #', position: 'insideBottom', offset: -2, fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v, _, p) => [`${v}/5 — ${p.payload.symbol}`, 'Emotion']} contentStyle={tipStyle} />
              <ReferenceLine y={3} stroke="var(--border-default)" strokeDasharray="4 4" label={{ value: 'neutral', position: 'right', fill: 'var(--text-muted)', fontSize: 10 }} />
              <Area type="monotone" dataKey="score" stroke="#a855f7" strokeWidth={2.5} fill="url(#emoGrad)" dot={{ fill: '#a855f7', strokeWidth: 0, r: 5 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </>
  )
}
