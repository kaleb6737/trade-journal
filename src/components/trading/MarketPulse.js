'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock3 } from 'lucide-react'

const SEED = [
  { symbol: 'ES1!', price: 5248.75 },
  { symbol: 'NQ1!', price: 18322.5 },
  { symbol: 'CL1!', price: 81.42 },
  { symbol: 'GC1!', price: 2358.2 },
  { symbol: 'BTC', price: 68320 },
  { symbol: 'ETH', price: 3528.5 },
]

function formatPrice(v) {
  if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return v.toFixed(2)
}

export default function MarketPulse() {
  const [rows, setRows] = useState(() =>
    SEED.map((r) => ({ ...r, change: 0, pct: 0 }))
  )
  const [nyTime, setNyTime] = useState('')
  const [localDate, setLocalDate] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setLocalDate(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })
      )
      setNyTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    }
    tick()
    const timer = setInterval(tick, 5000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const priceTimer = setInterval(() => {
      setRows((prev) =>
        prev.map((row) => {
          const swing = (Math.random() - 0.5) * (row.price * 0.0022)
          const nextPrice = Math.max(0.0001, row.price + swing)
          const ch = nextPrice - row.price
          const pct = row.price ? (ch / row.price) * 100 : 0
          return {
            ...row,
            price: nextPrice,
            change: ch,
            pct,
          }
        })
      )
    }, 5000)
    return () => clearInterval(priceTimer)
  }, [])

  const duplicated = useMemo(() => rows, [rows])
  const isRth = (() => {
    const d = new Date()
    const nyHour = parseInt(
      d.toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', hour12: false }),
      10
    )
    return nyHour >= 9 && nyHour < 16
  })()

  return (
    <div className="market-pulse">
      <div className="market-pulse-head">
        <span className={`market-session-pill ${isRth ? 'open' : 'after'}`}>
          {isRth ? 'RTH Open' : 'After Hours'}
        </span>
        <span className="market-clock" title="Your device calendar date vs US Eastern session clock">
          <Clock3 size={13} />
          <span className="market-local-date">{localDate || '…'}</span>
          <span className="market-ny-time"> · NY {nyTime || '--:--:--'}</span>
        </span>
      </div>

      <div className="market-tape-mask">
        <div className="market-tape-track">
          {duplicated.map((r, idx) => {
            const up = r.change >= 0
            return (
              <div key={`${r.symbol}-${idx}`} className="market-tape-item">
                <span className="sym">{r.symbol}</span>
                <span className="px">{formatPrice(r.price)}</span>
                <span className={up ? 'chg up' : 'chg down'}>
                  {up ? '+' : ''}
                  {r.pct.toFixed(2)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
