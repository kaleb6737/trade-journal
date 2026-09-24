export function BrandMonogram({ className = '' }) {
  return (
    <span className={`logo-icon ${className}`.trim()} aria-hidden="true">
      {/* SVG stays sharp in the collapsed sidebar and larger auth header. */}
      <img src="/brand-mark.svg" width="36" height="36" alt="" draggable="false" />
    </span>
  )
}

export function BrandWordmark({ className = '' }) {
  return (
    <span className={`logo-text ${className}`.trim()}>
      Trade<span className="logo-x">X</span><span className="logo-essence">Essence</span>
    </span>
  )
}
