'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import MarketPulse from '@/components/trading/MarketPulse'
import { formatCurrency, formatDate, formatPercent, parseTags, ASSET_TYPES, toMoneyNumber, tradeOutcome } from '@/lib/utils'
import { Plus, Search, Upload, Trash2, Edit, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { PRIVATE_TRADE_LABEL } from '@/lib/tradePrivacy'
import Papa from 'papaparse'
import TradeDrawer from '@/components/trading/TradeDrawer'
import { EmotionModal } from '@/components/trading/EmotionCheckIn'

function JournalPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [trades, setTrades] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ 
    status: '', 
    assetType: '', 
    side: '',
    date: searchParams.get('date') || ''
  })
  const [sort, setSort] = useState({ field: 'entryDate', dir: 'desc' })
  const [showImport, setShowImport] = useState(false)
  const [emotionTradeIds, setEmotionTradeIds] = useState(null)
  const [playbooks, setPlaybooks] = useState([])
  const [selectedTradeId, setSelectedTradeId] = useState(null)
  const [page, setPage] = useState(1)
  const limit = 50

  useEffect(() => {
    fetch('/api/playbooks').then(r => r.json()).then(d => setPlaybooks(d.playbooks || []))
  }, [])

  const fetchTrades = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.status)    params.set('status', filters.status)
    if (filters.assetType) params.set('assetType', filters.assetType)
    if (filters.side)      params.set('side', filters.side)
    if (filters.date)      params.set('date', filters.date)
    if (search)            params.set('symbol', search)
    params.set('limit', limit)
    params.set('offset', (page - 1) * limit)
    const res = await fetch(`/api/trades?${params}`)
    const data = await res.json()
    setTrades(data.trades || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [filters, search, page])

  useEffect(() => { fetchTrades() }, [fetchTrades])

  const deleteTrade = async (id) => {
    if (!confirm('Delete this trade?')) return
    await fetch(`/api/trades/${id}`, { method: 'DELETE' })
    fetchTrades()
  }

  const sorted = [...trades].sort((a, b) => {
    const dir = sort.dir === 'asc' ? 1 : -1
    if (sort.field === 'entryDate') return dir * (new Date(a.entryDate) - new Date(b.entryDate))
    if (sort.field === 'netPnl') {
      const av = a.hidden ? null : toMoneyNumber(a.netPnl)
      const bv = b.hidden ? null : toMoneyNumber(b.netPnl)
      const an = av ?? (dir === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY)
      const bn = bv ?? (dir === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY)
      return dir * (an - bn)
    }
    if (sort.field === 'symbol') {
      const as = a.hidden ? PRIVATE_TRADE_LABEL : a.symbol
      const bs = b.hidden ? PRIVATE_TRADE_LABEL : b.symbol
      return dir * as.localeCompare(bs)
    }
    return 0
  })

  const toggleSort = (field) => {
    setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'desc' })
  }

  const SortIcon = ({ field }) => {
    if (sort.field !== field) return <ChevronUp size={12} style={{ opacity: 0.3 }} />
    return sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  return (
    <>
      <div className="page-wrapper">
        {/* Header */}
        <div className="page-header page-header-premium flex items-center justify-between">
          <div className="page-header-text">
            <span className="page-eyebrow">Execution log</span>
            <h1 className="page-title-xl">Trade Journal</h1>
            <p className="page-subtitle">
              {total === 0
                ? 'Start your ledger — every fill you log sharpens the analytics.'
                : `${total} trade${total === 1 ? '' : 's'} on file — Hide keeps a row private in this grid and out of analytics; open it anytime for your full log.`}
            </p>
          </div>
          <div className="page-header-actions flex gap-2">
            <button type="button" onClick={() => setShowImport(true)} className="btn btn-secondary">
              <Upload size={15} /> Import CSV
            </button>
            <Link href="/journal/new" className="btn btn-primary btn-glow">
              <Plus size={16} /> Log Trade
            </Link>
          </div>
        </div>

        <MarketPulse />

        {/* Filters */}
        <div className="filter-bar">
          <div className="topbar-search">
            <Search size={15} />
            <input placeholder="Search symbol..." value={search}
              onChange={e => setSearch(e.target.value.toUpperCase())} />
          </div>
          <select className="form-select" style={{ width: 'auto' }}
            value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
            <option value="">All Status</option>
            <option value="CLOSED">Closed</option>
            <option value="OPEN">Open</option>
          </select>
          <select className="form-select" style={{ width: 'auto' }}
            value={filters.side} onChange={e => setFilters(p => ({ ...p, side: e.target.value }))}>
            <option value="">Long & Short</option>
            <option value="LONG">Long</option>
            <option value="SHORT">Short</option>
          </select>
          <select className="form-select" style={{ width: 'auto' }}
            value={filters.assetType} onChange={e => setFilters(p => ({ ...p, assetType: e.target.value }))}>
            <option value="">All Assets</option>
            {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {(filters.date) && (
            <div className="flex items-center gap-2 px-2 py-1 bg-[var(--bg-elevated)] rounded border border-[var(--border-subtle)] text-sm">
              <span>Date: {filters.date}</span>
              <button onClick={() => {
                setFilters(p => ({ ...p, date: '' }))
                router.replace('/journal')
              }} className="text-[var(--text-muted)] hover:text-white">✕</button>
            </div>
          )}
          {(filters.status || filters.side || filters.assetType || filters.date || search) && (
            <button className="btn btn-ghost btn-sm"
              onClick={() => { setFilters({ status: '', assetType: '', side: '', date: '' }); setSearch(''); router.replace('/journal') }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="table-wrapper tx-table-shell" style={{ display: 'flex', minHeight: 400, alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="empty-state-pro" style={{ marginTop: 32 }}>
            <div className="empty-icon-wrap"><Plus size={28} strokeWidth={2} /></div>
            <h3>{search || filters.status || filters.side || filters.assetType ? 'No matches' : 'Empty ledger'}</h3>
            <p>
              {search || filters.status || filters.side || filters.assetType
                ? 'Try widening filters or clearing search to see more trades.'
                : 'Record your first execution or import a broker CSV to populate this grid.'}
            </p>
            <Link href="/journal/new" className="btn btn-primary btn-sm btn-glow">Log your first trade</Link>
          </div>
        ) : (
          <div className="table-wrapper tx-table-shell journal-table-wrap" style={{ maxHeight: '800px', overflowY: 'auto' }}>
            <p className="journal-table-hint">
              <strong>Tip:</strong> <strong>Hide</strong> scrubs this row and keeps the trade out of analytics — open the row or <strong>Manage</strong> to see your full journal log anytime.
            </p>
            <table className="journal-table">
              <thead>
                <tr>
                  <th className="journal-sticky-lead" scope="col">
                    <button
                      type="button"
                      className="journal-th-sort"
                      onClick={() => toggleSort('symbol')}
                    >
                      Trade <SortIcon field="symbol" />
                    </button>
                  </th>
                  <th scope="col">Asset</th>
                  <th scope="col">
                    <button type="button" className="journal-th-sort" onClick={() => toggleSort('entryDate')}>
                      Entry <SortIcon field="entryDate" />
                    </button>
                  </th>
                  <th scope="col">Entry $</th>
                  <th scope="col">Exit $</th>
                  <th scope="col">Qty</th>
                  <th className="journal-col-narrow-xl" scope="col">Playbook</th>
                  <th scope="col">
                    <button type="button" className="journal-th-sort" onClick={() => toggleSort('netPnl')}>
                      Net P&amp;L <SortIcon field="netPnl" />
                    </button>
                  </th>
                  <th className="journal-col-narrow-lg" scope="col">Return</th>
                  <th scope="col">Result</th>
                  <th className="journal-col-narrow-lg" scope="col">Tags</th>
                  <th scope="col" title="Emotional control score">EQ</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(trade => {
                  const tags = parseTags(trade.tags)
                  const priv = !!trade.hidden
                  return (
                    <tr
                      key={trade.id}
                      onClick={() => setSelectedTradeId(trade.id)}
                      style={{ cursor: 'pointer', ...(priv ? { opacity: 0.85 } : {}) }}
                      title={priv ? 'Private — click to manage' : 'Open quick view'}
                      className="journal-table-row"
                    >
                      <td className="journal-sticky-lead">
                        <div className="journal-lead-cell">
                          <div className="journal-lead-symbol-row">
                            <span className="journal-lead-symbol">{priv ? PRIVATE_TRADE_LABEL : trade.symbol}</span>
                            {priv ? (
                              <span className="badge badge-gray" style={{ fontSize: 11 }}>Hidden</span>
                            ) : (
                              <span className={trade.side === 'LONG' ? 'side-long' : 'side-short'}>{trade.side}</span>
                            )}
                          </div>
                          <div className="journal-lead-actions" onClick={(e) => e.stopPropagation()}>
                            <Link
                              href={`/journal/${trade.id}`}
                              className="btn btn-primary btn-sm journal-lead-edit"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Edit size={14} aria-hidden /> {priv ? 'Manage' : 'Edit'}
                            </Link>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm journal-lead-delete"
                              title="Delete trade"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteTrade(trade.id)
                              }}
                            >
                              <Trash2 size={14} aria-hidden /> Delete
                            </button>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-gray">{priv ? '—' : trade.assetType}</span></td>
                      <td className="journal-td-muted">{priv ? '—' : formatDate(trade.entryDate, 'MMM d, yy')}</td>
                      <td>{priv ? '—' : `$${Number(trade.entryPrice).toFixed(2)}`}</td>
                      <td>{priv ? '—' : trade.exitPrice != null ? `$${Number(trade.exitPrice).toFixed(2)}` : '—'}</td>
                      <td className="journal-td-muted">{priv ? '—' : trade.quantity}</td>
                      <td className="journal-col-narrow-xl">
                        {priv ? (
                          <span className="journal-td-muted">—</span>
                        ) : trade.playbookId ? (
                          <span className="journal-playbook-name">{playbooks.find(p => p.id === trade.playbookId)?.name || 'Unknown'}</span>
                        ) : (
                          <span className="journal-td-muted">—</span>
                        )}
                      </td>
                      <td>
                        {priv ? (
                          <span className="journal-td-muted">—</span>
                        ) : trade.netPnl != null ? (
                          <span
                            className={
                              tradeOutcome(trade.netPnl) === 'WIN'
                                ? 'pnl-positive'
                                : tradeOutcome(trade.netPnl) === 'LOSS'
                                  ? 'pnl-negative'
                                  : 'pnl-flat'
                            }
                          >
                            {formatCurrency(trade.netPnl)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="journal-col-narrow-lg">
                        {priv ? (
                          <span className="journal-td-muted">—</span>
                        ) : trade.returnPercent != null ? (
                          <span
                            style={{
                              color:
                                trade.netPnl != null && tradeOutcome(trade.netPnl) === 'BE'
                                  ? 'var(--gold-primary)'
                                  : trade.returnPercent >= 0
                                    ? 'var(--green)'
                                    : 'var(--red)',
                              fontSize: 13,
                            }}
                          >
                            {formatPercent(trade.returnPercent)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {priv ? (
                          <span className="badge badge-gray">Private</span>
                        ) : (
                          <span
                            className={
                              trade.status === 'OPEN'
                                ? 'badge badge-blue'
                                : tradeOutcome(trade.netPnl) === 'WIN'
                                  ? 'badge badge-green'
                                  : tradeOutcome(trade.netPnl) === 'LOSS'
                                    ? 'badge badge-red'
                                    : 'badge badge-be'
                            }
                          >
                            {trade.status === 'OPEN'
                              ? 'Open'
                              : tradeOutcome(trade.netPnl) === 'WIN'
                                ? 'Win'
                                : tradeOutcome(trade.netPnl) === 'LOSS'
                                  ? 'Loss'
                                  : 'BE'}
                          </span>
                        )}
                      </td>
                      <td className="journal-col-narrow-lg journal-td-tags">
                        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                          {priv ? (
                            <span className="journal-td-muted">—</span>
                          ) : (
                            <>
                              {tags.slice(0, 2).map(t => <span key={t} className="tag">{t}</span>)}
                              {tags.length > 2 && <span className="tag">+{tags.length - 2}</span>}
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        {trade.emotionScore ? (
                          <span title={['','Out of control','Struggling','Neutral','In control','Fully focused'][trade.emotionScore]} style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 28, height: 28, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                            background: ['','rgba(239,68,68,0.15)','rgba(249,115,22,0.15)','rgba(234,179,8,0.15)','rgba(34,197,94,0.15)','rgba(20,184,166,0.15)'][trade.emotionScore],
                            color: ['','#ef4444','#f97316','#eab308','#22c55e','#14b8a6'][trade.emotionScore],
                            border: `1.5px solid ${ ['','#ef4444','#f97316','#eab308','#22c55e','#14b8a6'][trade.emotionScore]}`,
                          }}>
                            {trade.emotionScore}
                          </span>
                        ) : <span className="journal-td-muted">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && total > limit && (
          <div className="flex items-center justify-between mt-6 px-4">
            <div className="text-sm text-[var(--text-muted)]">
              Showing <span className="text-[var(--text-primary)] font-medium">{(page - 1) * limit + 1}</span> to <span className="text-[var(--text-primary)] font-medium">{Math.min(page * limit, total)}</span> of <span className="text-[var(--text-primary)] font-medium">{total}</span> trades
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                className="btn btn-secondary btn-icon"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm px-2 text-[var(--text-primary)]">Page {page} of {Math.ceil(total / limit)}</span>
              <button 
                onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))} 
                disabled={page >= Math.ceil(total / limit)}
                className="btn btn-secondary btn-icon"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Trade Drawer */}
      {selectedTradeId && (
        <TradeDrawer 
          tradeId={selectedTradeId} 
          onClose={() => setSelectedTradeId(null)} 
          onUpdate={() => fetchTrades()} 
        />
      )}

      {/* CSV Import Modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImport={fetchTrades}
          onEmotionRate={(ids) => setEmotionTradeIds(ids)}
        />
      )}
      {emotionTradeIds && (
        <EmotionModal
          tradeIds={emotionTradeIds}
          onClose={() => setEmotionTradeIds(null)}
        />
      )}
    </>
  )
}

export default function JournalPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading journal...</div>}>
      <JournalPageContent />
    </Suspense>
  )
}

function ImportModal({ onClose, onImport, onEmotionRate }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [importedIds, setImportedIds] = useState([])

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    Papa.parse(f, {
      header: true, skipEmptyLines: true, preview: 5,
      complete: (res) => setPreview(res.data),
    })
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (res) => {
        const payloads = []
        let failed = 0
        // Parses "$1,234.56" and "$(1,234.56)" (Tradovate negative format)
        const parseDollar = (v) => {
          if (v === undefined || v === null || v === '') return null
          const s = String(v).trim()
          const neg = s.match(/^\$\(([0-9,]+\.?\d*)\)$/)
          if (neg) return -parseFloat(neg[1].replace(/,/g, ''))
          const n = parseFloat(s.replace(/[$,]/g, ''))
          return Number.isNaN(n) ? null : n
        }

        for (const row of res.data) {
          try {
            // Tradovate Performance CSV: buyPrice/sellPrice/boughtTimestamp columns
            const isTradovatePerf = 'buyPrice' in row || 'boughtTimestamp' in row
            // Tradovate older export or other brokers
            const isTradovateAlt  = 'B/S' in row || 'Buy/Sell' in row || ('Contract' in row && ('Open Time' in row || 'Close Time' in row))
            const isTradovate = isTradovatePerf || isTradovateAlt

            let symbol, side, entryPrice, exitPrice, quantity, entryDate, exitDate

            if (isTradovatePerf) {
              symbol = row.symbol || row.Symbol || ''
              const buyTs  = row.boughtTimestamp ? new Date(row.boughtTimestamp) : null
              const sellTs = row.soldTimestamp   ? new Date(row.soldTimestamp)   : null
              const isLong = !buyTs || !sellTs || buyTs <= sellTs
              side       = isLong ? 'LONG' : 'SHORT'
              entryPrice = isLong ? parseFloat(row.buyPrice  || 0) : parseFloat(row.sellPrice || 0)
              exitPrice  = isLong ? parseFloat(row.sellPrice || 0) || null : parseFloat(row.buyPrice || 0) || null
              quantity   = parseFloat(row.qty || row.Qty || 1)
              entryDate  = isLong ? (row.boughtTimestamp || new Date().toISOString()) : (row.soldTimestamp || new Date().toISOString())
              exitDate   = isLong ? (row.soldTimestamp || null) : (row.boughtTimestamp || null)
            } else {
              symbol = row.Symbol || row.symbol || row.Instrument || row.Ticker || row.Contract || ''
              const bsRaw = row['B/S'] || row['Buy/Sell'] || row.Side || row.Action || row.Type || 'BUY'
              const bsUp  = bsRaw.trim().toUpperCase()
              side       = bsUp === 'S' || bsUp === 'SELL' || bsUp.includes('SHORT') ? 'SHORT' : 'LONG'
              entryPrice = parseFloat(row['Entry Price'] || row.EntryPrice || row['Buy Price'] || row.Price || row.Open || 0)
              exitPrice  = parseFloat(row['Exit Price']  || row.ExitPrice  || row['Sell Price'] || row.Close || 0) || null
              quantity   = parseFloat(row.Quantity || row.Qty || row.Shares || row.Contracts || 1)
              entryDate  = row['Entry Date'] || row.EntryDate || row['Open Time'] || row.Date || row.OpenDate || new Date().toISOString()
              exitDate   = row['Exit Date']  || row.ExitDate  || row['Close Time'] || row.CloseDate || null
            }

            const rawPnl    = row.pnl ?? row['Net P&L'] ?? row['Gross P&L'] ?? row.PnL ?? row['Realized P&L'] ?? row.Gain
            const netPnlRaw = parseDollar(rawPnl)
            const hasPnl    = netPnlRaw != null && !Number.isNaN(netPnlRaw)

            if (!symbol || !entryPrice) { failed++; continue }

            const payload = {
              symbol, side, entryPrice, exitPrice, quantity,
              entryDate: new Date(entryDate).toISOString(),
              exitDate:  exitDate ? new Date(exitDate).toISOString() : null,
              status: exitDate || hasPnl ? 'CLOSED' : 'OPEN',
              commission: parseFloat(row.Commission || 0),
              fees: parseFloat(row.Fees || 0),
            }
            if (hasPnl) payload.manualPnl = netPnlRaw
            if (isTradovate) payload.assetType = 'FUTURES'
            payloads.push(payload)
          } catch { failed++ }
        }

        let imported = 0
        const CHUNK = 500
        for (let i = 0; i < payloads.length; i += CHUNK) {
          const chunk = payloads.slice(i, i + CHUNK)
          try {
            const r = await fetch('/api/trades/bulk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ trades: chunk }),
            })
            if (!r.ok) {
              failed += chunk.length
              continue
            }
            const j = await r.json()
            imported += j.created ?? 0
            if (Array.isArray(j.trades)) setImportedIds(p => [...p, ...j.trades.map(t => t.id)])
          } catch {
            failed += chunk.length
          }
        }
        setResult({ imported, failed })
        setLoading(false)
        onImport()
      },
    })
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Import Trades from CSV</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">✕</button>
        </div>

        {!result ? (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
              Upload a CSV file from your broker. Tradovate performance exports are fully supported. We also auto-detect columns for Symbol, Entry/Exit Price, Quantity, Dates, and P&L.
            </p>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">CSV File</label>
              <input id="csv-upload" type="file" accept=".csv" onChange={handleFile}
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 12, color: 'var(--text-primary)', fontSize: 14, width: '100%' }} />
            </div>
            {preview.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div className="form-label" style={{ marginBottom: 8 }}>Preview (first 5 rows)</div>
                <div style={{ overflowX: 'auto', background: 'var(--bg-surface)', borderRadius: 8, padding: 12, fontSize: 12 }}>
                  <pre style={{ color: 'var(--text-secondary)', margin: 0 }}>
                    {JSON.stringify(preview[0], null, 2).slice(0, 400)}...
                  </pre>
                </div>
              </div>
            )}
            <div className="flex gap-3 justify-between">
              <button onClick={onClose} className="btn btn-secondary">Cancel</button>
              <button onClick={handleImport} disabled={!file || loading} className="btn btn-primary">
                {loading ? 'Importing...' : `Import ${file ? 'File' : ''}`}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ marginBottom: 8 }}>Import Complete</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{result.imported} trades imported, {result.failed} skipped</p>
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {importedIds.length > 0 && (
                <button
                  onClick={() => { onClose(); onEmotionRate(importedIds) }}
                  className="btn btn-primary"
                  style={{ justifyContent: 'center' }}
                >
                  🧠 Rate your emotions
                </button>
              )}
              <button onClick={onClose} className={importedIds.length > 0 ? 'btn btn-secondary' : 'btn btn-primary'} style={{ justifyContent: 'center' }}>
                {importedIds.length > 0 ? 'Skip' : 'Done'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
