'use client'

import { CalendarRange, ChevronsLeft, ChevronsRight, Layers, Plus, Undo2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ALL_WEEKS, periodLabel } from '@/lib/journalWeeks'

export { ALL_WEEKS, buildWeeks, localDayKey, periodLabel, periodOf } from '@/lib/journalWeeks'

export default function WeekNav({ weeks, selectedStart, onSelect, totalTrades, onStartWeek, onUndoWeek, canUndo, busy, collapsed, onToggleCollapse }) {
  const current = weeks.find((w) => w.start <= Date.now() && Date.now() < w.end)?.start
  const prev = weeks.find((w) => w.start < current)?.start
  const name = (w) => (w.start === current ? 'This week' : w.start === prev ? 'Last week' : periodLabel(w))

  if (collapsed) {
    return (
      <nav className="week-nav week-nav--collapsed" aria-label="Trade weeks">
        <button type="button" className="week-nav-rail" onClick={onToggleCollapse} title="Show weeks" aria-expanded="false">
          <ChevronsRight size={16} aria-hidden />
          <CalendarRange size={16} aria-hidden />
          <span className="week-nav-rail-label">Weeks</span>
        </button>
      </nav>
    )
  }

  return (
    <nav className="week-nav" aria-label="Trade weeks">
      <div className="week-nav-title">
        <CalendarRange size={13} aria-hidden /> Weeks
        <button type="button" className="week-nav-collapse" onClick={onToggleCollapse} title="Collapse to the side" aria-expanded="true">
          <ChevronsLeft size={15} aria-hidden />
        </button>
      </div>
      <div className="week-nav-actions">
        <button type="button" className="btn btn-secondary btn-sm week-nav-start" onClick={onStartWeek} disabled={busy} title="Start a fresh week from right now">
          <Plus size={13} /> Start new week
        </button>
        {canUndo && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onUndoWeek} disabled={busy} title="Undo the last new-week start">
            <Undo2 size={13} /> Undo
          </button>
        )}
      </div>
      <div className="week-nav-list">
        {weeks.map((w) => (
          <button
            key={w.start}
            type="button"
            className={`week-nav-item${selectedStart === w.start ? ' active' : ''}`}
            onClick={() => onSelect(w.start)}
            aria-current={selectedStart === w.start ? 'true' : undefined}
          >
            <span className="week-nav-name">{name(w)}</span>
            {name(w) !== periodLabel(w) && <span className="week-nav-range">{periodLabel(w)}</span>}
            <span className="week-nav-meta">
              {w.trades} trade{w.trades === 1 ? '' : 's'}
              {w.trades > 0 && (
                <span className={w.net > 0 ? 'pnl-positive' : w.net < 0 ? 'pnl-negative' : 'pnl-flat'}> · {formatCurrency(w.net)}</span>
              )}
            </span>
          </button>
        ))}
        <button
          type="button"
          className={`week-nav-item week-nav-all${selectedStart === ALL_WEEKS ? ' active' : ''}`}
          onClick={() => onSelect(ALL_WEEKS)}
        >
          <span className="week-nav-name"><Layers size={12} aria-hidden /> All trades</span>
          <span className="week-nav-meta">{totalTrades} total</span>
        </button>
      </div>
    </nav>
  )
}
