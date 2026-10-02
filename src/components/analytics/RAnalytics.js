'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { AlertTriangle, Target, TrendingUp, TrendingDown, Scale, Activity, Award, ShieldAlert, Lightbulb } from 'lucide-react'
import { formatR } from '@/lib/rMultiple'

const GREEN = '#22C55E'
const RED = '#EF4444'
const GOLD = '#E8C66A'
const rColor = (r) => (r == null ? 'var(--text-muted)' : r > 0 ? 'var(--green)' : r < 0 ? 'var(--red)' : 'var(--gold-primary)')

function RTooltip({ active, payload, label, kind }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="r-tooltip">
      {kind === 'curve' ? (
        <>
          <div className="r-tooltip-title">Trade #{p.n} · {p.symbol} · {new Date(p.date).toLocaleDateString()}</div>
          <div>This trade: <strong style={{ color: rColor(p.r) }}>{formatR(p.r)}</strong></div>
          <div>Cumulative: <strong style={{ color: rColor(p.cumR) }}>{formatR(p.cumR)}</strong></div>
        </>
      ) : (
        <><div className="r-tooltip-title">{label}</div><div><strong>{p.count}</strong> trade{p.count === 1 ? '' : 's'}</div></>
      )}
    </div>
  )
}

/** Compact R numbers for the Overview tab. */
export function RSummaryStrip({ r, onOpen }) {
  if (!r.count) {
    return (
      <div className="r-strip r-strip--empty">
        <Target size={16} />
        <span>Start logging <strong>R gained / lost</strong> on each trade to unlock R-based analytics.</span>
      </div>
    )
  }
  const items = [
    ['Total R', formatR(r.totalR), rColor(r.totalR)],
    ['Expectancy', `${formatR(r.avgR)} / trade`, rColor(r.avgR)],
    ['Avg win', formatR(r.avgWinR), 'var(--green)'],
    ['Avg loss', formatR(r.avgLossR), 'var(--red)'],
    ['R profit factor', r.profitFactorR ?? '—', 'var(--text-primary)'],
  ]
  return (
    <button type="button" className="r-strip" onClick={onOpen} title="Open R-Multiple analytics">
      {items.map(([label, value, color]) => (
        <div key={label} className="r-strip-item">
          <span className="r-strip-label">{label}</span>
          <span className="r-strip-value" style={{ color }}>{value}</span>
        </div>
      ))}
      <span className="r-strip-coverage">{r.count}/{r.closedTrades} trades with R</span>
    </button>
  )
}

function insightsFor(r) {
  const out = []
  if (r.avgWinR != null && r.avgLossR != null) {
    const payoff = r.avgWinR / Math.abs(r.avgLossR)
    const breakEven = 100 / (1 + payoff)
    const diff = r.winRate - breakEven
    out.push({
      tone: diff >= 0 ? 'good' : 'bad',
      text: `Your average winner (${formatR(r.avgWinR)}) is ${payoff.toFixed(2)}× your average loser (${formatR(r.avgLossR)}). At that payoff you break even at a ${breakEven.toFixed(0)}% win rate — you're at ${r.winRate}%, ${Math.abs(diff).toFixed(0)} pts ${diff >= 0 ? 'above' : 'below'} it.`,
    })
  }
  const dims = [['playbook', r.byPlaybook], ['session', r.bySession], ['weekday', r.byDay], ['symbol', r.bySymbol]]
  const all = dims.flatMap(([dim, rows]) => rows.filter((g) => g.count >= 2).map((g) => ({ ...g, dim })))
  const best = [...all].sort((a, b) => b.totalR - a.totalR)[0]
  const worst = [...all].sort((a, b) => a.totalR - b.totalR)[0]
  if (best && best.totalR > 0) out.push({ tone: 'good', text: `Biggest edge: ${best.dim} "${best.name}" — ${formatR(best.totalR)} over ${best.count} trades (${formatR(best.avgR)} each).` })
  if (worst && worst.totalR < 0) out.push({ tone: 'bad', text: `Biggest leak: ${worst.dim} "${worst.name}" — ${formatR(worst.totalR)} over ${worst.count} trades. Cutting it would have lifted your total to ${formatR(r.totalR - worst.totalR)}.` })
  if (r.worstR != null && r.avgLossR != null && r.worstR < r.avgLossR * 1.5 && r.worstR <= -1.5) {
    out.push({ tone: 'bad', text: `Your worst trade (${formatR(r.worstR)}) is far bigger than your average loss (${formatR(r.avgLossR)}) — losses past −1R usually mean a stop wasn't honored.` })
  }
  return out
}

const DIMENSIONS = [
  ['byPlaybook', 'Playbook'], ['bySession', 'Session'], ['byDay', 'Weekday'], ['bySide', 'Side'], ['bySymbol', 'Symbol'],
]

export default function RAnalytics({ r }) {
  const [dim, setDim] = useState('byPlaybook')

  if (!r.count) {
    return (
      <div className="empty-state-pro">
        <div className="empty-icon-wrap"><Target size={28} /></div>
        <h3>No R logged yet</h3>
        <p>R shows how much you made or lost relative to what you risked — the cleanest way to judge a strategy, independent of position size. Log it on each trade (new trades ask for it; open an older trade to add it).</p>
        <Link href="/journal" className="btn btn-primary btn-sm btn-glow">Go to journal</Link>
      </div>
    )
  }

  const rows = r[dim]
  const maxAbs = Math.max(...rows.map((g) => Math.abs(g.totalR)), 0.01)
  const kpis = [
    { label: 'Total R', value: formatR(r.totalR), color: rColor(r.totalR), icon: Activity },
    { label: 'Expectancy', value: formatR(r.avgR), sub: 'average R per trade', color: rColor(r.avgR), icon: Target },
    { label: 'Win rate', value: r.winRate != null ? `${r.winRate}%` : '—', sub: `${r.count} trades with R`, icon: Award },
    { label: 'Avg winner', value: formatR(r.avgWinR), color: 'var(--green)', icon: TrendingUp },
    { label: 'Avg loser', value: formatR(r.avgLossR), color: 'var(--red)', icon: TrendingDown },
    { label: 'R profit factor', value: r.profitFactorR ?? '—', sub: 'R won ÷ R lost', icon: Scale },
    { label: 'Best / worst', value: `${formatR(r.bestR)} / ${formatR(r.worstR)}`, icon: Award },
    { label: 'Max drawdown', value: formatR(r.maxDrawdownR), sub: `worst losing run ${formatR(r.worstLosingStreakR)}`, color: 'var(--red)', icon: ShieldAlert },
  ]

  return (
    <div className="r-analytics">
      {r.missing > 0 && (
        <div className="r-coverage">
          <AlertTriangle size={16} />
          <span><strong>{r.missing}</strong> of {r.closedTrades} closed trades have no R logged, so they're left out below. Open them in the <Link href="/journal">journal</Link> to add R.</span>
        </div>
      )}

      <div className="r-kpis">
        {kpis.map(({ label, value, sub, color, icon: Icon }) => (
          <div key={label} className="r-kpi">
            <div className="r-kpi-head"><Icon size={14} /> {label}</div>
            <div className="r-kpi-value" style={{ color: color || 'var(--text-primary)' }}>{value}</div>
            {sub && <div className="r-kpi-sub">{sub}</div>}
          </div>
        ))}
      </div>

      {insightsFor(r).length > 0 && (
        <div className="r-insights">
          <div className="r-insights-title"><Lightbulb size={14} /> What your R says</div>
          {insightsFor(r).map((ins, i) => (
            <p key={i} className={`r-insight r-insight--${ins.tone}`}>{ins.text}</p>
          ))}
        </div>
      )}

      <div className="r-charts">
        <div className="chart-card">
          <div className="chart-card-title">Cumulative R</div>
          <div className="r-chart-sub">Every closed trade with R, in order — the slope is your edge.</div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={r.curve} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="rCurveFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={r.totalR >= 0 ? GREEN : RED} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={r.totalR >= 0 ? GREEN : RED} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="n" tick={{ fill: '#908C85', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#908C85', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}R`} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" />
              <Tooltip content={<RTooltip kind="curve" />} />
              <Area type="monotone" dataKey="cumR" stroke={r.totalR >= 0 ? GREEN : RED} strokeWidth={2} fill="url(#rCurveFill)" dot={r.curve.length <= 40} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-title">R distribution</div>
          <div className="r-chart-sub">How your outcomes spread. Healthy: small, capped losses and a right tail of winners.</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={r.distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fill: '#908C85', fontSize: 10 }} tickLine={false} axisLine={false} interval={0} />
              <YAxis allowDecimals={false} tick={{ fill: '#908C85', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<RTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {r.distribution.map((b) => <Cell key={b.bucket} fill={b.bucket === '0R' ? GOLD : b.positive ? GREEN : RED} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <div className="r-breakdown-head">
          <div>
            <div className="chart-card-title">Where your R comes from</div>
            <div className="r-chart-sub">Total R, expectancy and win rate for each group.</div>
          </div>
          <div className="r-dim-tabs">
            {DIMENSIONS.map(([key, label]) => (
              <button key={key} type="button" className={`r-dim-tab${dim === key ? ' active' : ''}`} onClick={() => setDim(key)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="r-table-wrap">
          <table className="r-table">
            <thead>
              <tr><th>{DIMENSIONS.find(([k]) => k === dim)[1]}</th><th>Trades</th><th>Total R</th><th>Expectancy</th><th>Win rate</th><th>Avg win / loss</th></tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.name}>
                  <td className="r-table-name">{g.name}</td>
                  <td>{g.count}</td>
                  <td>
                    <div className="r-bar-cell">
                      <span style={{ color: rColor(g.totalR), fontWeight: 700 }}>{formatR(g.totalR)}</span>
                      <span className="r-bar"><span style={{ width: `${(Math.abs(g.totalR) / maxAbs) * 100}%`, background: g.totalR >= 0 ? GREEN : RED }} /></span>
                    </div>
                  </td>
                  <td style={{ color: rColor(g.avgR), fontWeight: 600 }}>{formatR(g.avgR)}</td>
                  <td>{g.winRate != null ? `${g.winRate}%` : '—'}</td>
                  <td className="r-table-muted">{formatR(g.avgWinR)} / {formatR(g.avgLossR)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
