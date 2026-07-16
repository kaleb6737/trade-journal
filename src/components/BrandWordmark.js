export function BrandMonogram({ className = '' }) {
  return <div className={`logo-icon ${className}`.trim()}>TX</div>
}

export function BrandWordmark({ className = '' }) {
  return (
    <span className={`logo-text ${className}`.trim()}>
      Trade<span className="logo-x">X</span><span className="logo-essence">Essence</span>
    </span>
  )
}
