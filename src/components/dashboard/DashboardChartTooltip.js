'use client'

import { formatCurrency, toMoneyNumber } from '@/lib/utils'

export default function DashboardChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  const raw = row?.pnl ?? row?.value ?? payload[0]?.value
  const v = toMoneyNumber(raw) ?? 0
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: v >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
        {formatCurrency(raw)}
      </div>
    </div>
  )
}
