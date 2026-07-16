export default function AppLoading() {
  return (
    <div className="page-wrapper" style={{ minHeight: '80vh' }}>
      {/* Skeleton header */}
      <div style={{ marginBottom: 32 }}>
        <div className="skeleton-line" style={{ width: 100, height: 12, marginBottom: 10 }} />
        <div className="skeleton-line" style={{ width: 260, height: 28, marginBottom: 10 }} />
        <div className="skeleton-line" style={{ width: 380, height: 14 }} />
      </div>

      {/* Skeleton stats row */}
      <div className="grid-stats" style={{ marginBottom: 24 }}>
        {[1,2,3,4].map(i => (
          <div key={i} className="card" style={{ padding: 20 }}>
            <div className="skeleton-line" style={{ width: 60, height: 10, marginBottom: 12 }} />
            <div className="skeleton-line" style={{ width: 100, height: 24, marginBottom: 8 }} />
            <div className="skeleton-line" style={{ width: 80, height: 10 }} />
          </div>
        ))}
      </div>

      {/* Skeleton chart area */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, minHeight: 280 }}>
          <div className="skeleton-line" style={{ width: 140, height: 16, marginBottom: 8 }} />
          <div className="skeleton-line" style={{ width: 200, height: 12, marginBottom: 24 }} />
          <div className="skeleton-line" style={{ width: '100%', height: 180, borderRadius: 8 }} />
        </div>
        <div className="card" style={{ padding: 20, minHeight: 280 }}>
          <div className="skeleton-line" style={{ width: 160, height: 16, marginBottom: 8 }} />
          <div className="skeleton-line" style={{ width: 180, height: 12, marginBottom: 24 }} />
          <div className="skeleton-line" style={{ width: '100%', height: 180, borderRadius: 8 }} />
        </div>
      </div>
    </div>
  )
}
