'use client'

export default function DashboardSkeleton() {
  return (
    <div className="page-wrapper dashboard-skeleton" aria-busy="true" aria-label="Loading dashboard">
      <div className="page-header page-header-premium flex items-center justify-between">
        <div className="page-header-text sk-text-block">
          <div className="sk-line sk-line--sm" />
          <div className="sk-line sk-line--hero" />
          <div className="sk-line sk-line--md" />
        </div>
        <div className="sk-blob sk-blob--btn" />
      </div>

      <div className="sk-blob sk-blob--pulse" />
      <div className="sk-blob sk-blob--desk" />

      <div className="grid-stats" style={{ marginBottom: 24 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="stat-card sk-stat-card">
            <div className="sk-blob sk-blob--icon" />
            <div className="sk-line sk-line--sm sk-line--mt" />
            <div className="sk-line sk-line--lg sk-line--mt2" />
            <div className="sk-line sk-line--xs sk-line--mt" />
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {[1, 2].map((i) => (
          <div key={i} className="chart-card sk-chart-card">
            <div className="sk-line sk-line--md" />
            <div className="sk-line sk-line--sm sk-line--mb" />
            <div className="sk-blob sk-blob--chart" />
          </div>
        ))}
      </div>

      <div className="sk-blob sk-blob--heatmap" />

      <div className="card sk-cal-card">
        <div className="sk-line sk-line--title sk-line--mb" />
        <div className="sk-cal-grid">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="sk-blob sk-blob--cell" />
          ))}
        </div>
      </div>

      <div className="grid-2">
        {[1, 2].map((i) => (
          <div key={i} className="card sk-list-card">
            <div className="sk-line sk-line--md sk-line--mb" />
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="sk-line sk-line--sm sk-line--list" style={{ width: `${88 - j * 6}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
