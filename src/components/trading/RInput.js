'use client'

import { formatR, normalizeR, parseR, suggestR } from '@/lib/rMultiple'

const QUICK = [-1, -0.5, 1, 2, 3]

/**
 * "How much R did this trade make or lose?" Sign follows the P&L when it's known,
 * so a trader can type 1 on a losing trade and it saves as −1R.
 */
export default function RInput({ value, onChange, pnl, suggestion, required = false, compact = false }) {
  const suggested = suggestion ? suggestR(suggestion) : null
  const typed = parseR(value)
  const saved = typed == null ? null : normalizeR(typed, pnl)
  const flipped = typed != null && saved !== typed

  return (
    <div className={`r-input${compact ? ' r-input--compact' : ''}`}>
      <label className="form-label" htmlFor="trade-r">
        R gained / lost{required ? ' *' : ''}
      </label>
      <div className="r-input-row">
        <div className="r-input-field">
          <input
            id="trade-r"
            type="number"
            step="0.01"
            inputMode="decimal"
            className="form-input"
            placeholder="e.g. 2 or -1"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <span className="r-input-suffix">R</span>
        </div>
        {saved != null && (
          <span className={`r-input-result ${saved > 0 ? 'pnl-positive' : saved < 0 ? 'pnl-negative' : 'pnl-flat'}`}>{formatR(saved)}</span>
        )}
      </div>
      <div className="r-input-quick">
        {QUICK.map((q) => (
          <button key={q} type="button" className="r-chip" onClick={() => onChange(String(q))}>{formatR(q)}</button>
        ))}
        {suggested != null && (
          <button type="button" className="r-chip r-chip--suggest" onClick={() => onChange(String(suggested))} title="Calculated from your entry, stop and exit">
            Use {formatR(suggested)} from stop
          </button>
        )}
      </div>
      {!compact && (
        <p className="r-input-hint">
          1R = the amount you planned to risk. {flipped
            ? `Saved as ${formatR(saved)} to match the ${pnl < 0 ? 'loss' : 'win'}.`
            : 'The sign follows the P&L, so you can type 1 for a 1R loss.'}
        </p>
      )}
    </div>
  )
}
