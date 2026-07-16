'use client'

import React from 'react'
import { parseISO, format } from 'date-fns'

export default function StreakHeatmap({ activityData }) {
  if (!activityData || !activityData.history) return null

  const { history, currentStreak, longestStreak, totalTradesLastYear } = activityData

  // Prepare grid
  // Find the day of week for the very first date in the history
  const firstDateStr = history[0].date
  const firstDate = new Date(firstDateStr + 'T00:00:00')
  const startDay = firstDate.getDay() // 0 = Sunday, 6 = Saturday

  // We need empty placeholders for the days before startDay in that first week
  const gridCells = []
  for (let i = 0; i < startDay; i++) {
    gridCells.push(null)
  }
  
  // Add actual days
  gridCells.push(...history)

  const getHeatmapColor = (count) => {
    if (count === 0) return 'var(--bg-surface)'
    if (count <= 2) return 'rgba(212, 175, 55, 0.4)' // Faint gold
    if (count <= 5) return 'rgba(212, 175, 55, 0.65)'
    if (count <= 10) return 'rgba(212, 175, 55, 0.85)'
    return 'var(--gold-primary)' // > 10 trades
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div className="card streak-card" style={{ padding: 24, marginBottom: 24 }}>
      <div className="flex justify-between items-end" style={{ marginBottom: 20 }}>
        <div>
          <div className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            Trading Consistency
            {currentStreak >= 3 && <span title="On fire!" style={{ fontSize: 16 }}>🔥</span>}
          </div>
          <p className="page-subtitle" style={{ margin: '4px 0 0', fontSize: 13 }}>{totalTradesLastYear} trades in the last year</p>
        </div>
        <div style={{ display: 'flex', gap: 24, textAlign: 'right' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Current Streak</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: currentStreak > 0 ? 'var(--gold-primary)' : 'var(--text-secondary)', fontFamily: 'Space Grotesk' }}>
              {currentStreak} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>day{currentStreak !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Longest Streak</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Space Grotesk' }}>
              {longestStreak} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>day{longestStreak !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="heatmap-container" style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ minWidth: 700 }}>
          {/* Heatmap Grid */}
          <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column', gap: 4, height: 106 }}>
            {gridCells.map((cell, i) => {
              if (!cell) {
                return <div key={`empty-${i}`} style={{ width: 12, height: 12, borderRadius: 2 }} />
              }
              const d = new Date(cell.date + 'T00:00:00')
              const tooltipLabel = `${format(d, 'MMM d, yyyy')}: ${cell.count} trade${cell.count !== 1 ? 's' : ''}`
              return (
                <div 
                  key={cell.date} 
                  title={tooltipLabel}
                  style={{ 
                    width: 12, height: 12, borderRadius: 2, 
                    background: getHeatmapColor(cell.count),
                    transition: 'transform 0.1s',
                    cursor: 'crosshair',
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                />
              )
            })}
          </div>
          
          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            Less
            <div style={{ width: 12, height: 12, borderRadius: 2, background: getHeatmapColor(0) }} />
            <div style={{ width: 12, height: 12, borderRadius: 2, background: getHeatmapColor(1) }} />
            <div style={{ width: 12, height: 12, borderRadius: 2, background: getHeatmapColor(4) }} />
            <div style={{ width: 12, height: 12, borderRadius: 2, background: getHeatmapColor(8) }} />
            <div style={{ width: 12, height: 12, borderRadius: 2, background: getHeatmapColor(12) }} />
            More
          </div>
        </div>
      </div>
    </div>
  )
}
