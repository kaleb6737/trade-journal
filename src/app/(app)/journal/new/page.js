'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NotesEditor from '@/components/NotesEditor'
import { ASSET_TYPES, TRADE_SIDES, BROKERS, parseTags, tradeOutcome } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { EmotionModal } from '@/components/trading/EmotionCheckIn'

export default function NewTradePage() {
  const router = useRouter()
  const [form, setForm] = useState({
    symbol: '', side: 'LONG', assetType: 'STOCK', status: 'CLOSED',
    entryDate: new Date().toISOString().slice(0, 16),
    exitDate: new Date().toISOString().slice(0, 16),
    entryPrice: '', exitPrice: '', quantity: '',
    commission: '0', fees: '0', stopLoss: '', takeProfit: '',
    notes: '', playbookId: '', accountId: '', tradeSession: '', tagInput: '', tags: [],
    manualPnl: '',
  })
  const [useManualPnl, setUseManualPnl] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [playbooks, setPlaybooks] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [creatingPlaybook, setCreatingPlaybook] = useState(false)
  const [newPlaybookName, setNewPlaybookName] = useState('')
  const [emotionTradeId, setEmotionTradeId] = useState(null)

  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then(d => setAccounts(d.accounts || []))
    fetch('/api/playbooks').then(r => r.json()).then(d => setPlaybooks(d.playbooks || []))
  }, [])

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))

  const setStatus = (e) => {
    const v = e.target.value
    setForm((p) => {
      const next = { ...p, status: v }
      if (v === 'CLOSED' && !String(p.exitDate ?? '').trim()) {
        next.exitDate = new Date().toISOString().slice(0, 16)
      }
      return next
    })
  }

  const addTag = () => {
    if (!form.tagInput.trim()) return
    if (form.tags.includes(form.tagInput.trim())) return
    setForm(p => ({ ...p, tags: [...p.tags, p.tagInput.trim()], tagInput: '' }))
  }

  const removeTag = (t) => setForm(p => ({ ...p, tags: p.tags.filter(x => x !== t) }))

  // Live P&L preview
  const previewPnl = () => {
    if (useManualPnl) {
      if (form.manualPnl === '' || form.manualPnl === '-') return null
      return parseFloat(form.manualPnl)
    }
    if (!form.entryPrice || !form.exitPrice || !form.quantity) return null
    const dir = form.side === 'LONG' ? 1 : -1
    const gross = dir * (parseFloat(form.exitPrice) - parseFloat(form.entryPrice)) * parseFloat(form.quantity)
    const net = gross - parseFloat(form.commission || 0) - parseFloat(form.fees || 0)
    return net
  }
  const pnl = previewPnl()

  const handleCreatePlaybook = async () => {
    if (!newPlaybookName.trim()) return
    try {
      const res = await fetch('/api/playbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlaybookName.trim(), color: '#D4AF37' })
      })
      if (res.ok) {
        const { playbook } = await res.json()
        setPlaybooks(p => [...p, playbook])
        setForm(p => ({ ...p, playbookId: playbook.id }))
        setCreatingPlaybook(false)
        setNewPlaybookName('')
      }
    } catch (e) {
      console.error('Failed to create playbook', e)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.symbol || !form.entryPrice || !form.quantity) { setError('Symbol, entry price, and quantity are required.'); return }
    setLoading(true)
    try {
      const payload = {
        symbol: form.symbol, side: form.side, assetType: form.assetType, status: form.status,
        entryDate: new Date(form.entryDate).toISOString(),
        exitDate:  form.exitDate ? new Date(form.exitDate).toISOString() : null,
        entryPrice: form.entryPrice, exitPrice:  form.exitPrice || null,
        quantity: form.quantity, commission: form.commission, fees: form.fees,
        stopLoss: form.stopLoss || null, takeProfit: form.takeProfit || null,
        notes: form.notes, tags: form.tags,
        playbookId: form.playbookId || null, accountId: form.accountId || null,
        tradeSession: form.tradeSession || null,
      }
      if (useManualPnl && form.manualPnl !== '') {
        payload.manualPnl = parseFloat(form.manualPnl)
      }
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to save trade'); setLoading(false); return }
      const saved = await res.json()
      setEmotionTradeId(saved.trade?.id || null)
    } catch { setError('Something went wrong. Try again.'); setLoading(false) }
  }

  return (
    <>
      {emotionTradeId && (
        <EmotionModal
          tradeIds={emotionTradeId}
          onClose={() => { setEmotionTradeId(null); router.push(`/journal/${emotionTradeId}`) }}
        />
      )}
      <div className="page-wrapper">
        <div className="page-header flex items-center gap-3">
          <Link href="/journal" className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
          <div>
            <h1>Log New Trade</h1>
            <p>Record a new trade in your journal</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid-2" style={{ gap: 24 }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Trade Info */}
              <div className="card">
                <div className="section-title">Trade Information</div>
                <div className="grid-2">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Symbol *</label>
                    <input id="trade-symbol" className="form-input" placeholder="AAPL, ES, EURUSD..."
                      value={form.symbol} onChange={set('symbol')} style={{ textTransform: 'uppercase', fontSize: '1rem', fontWeight: 700 }} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Side *</label>
                    <select id="trade-side" className="form-select" value={form.side} onChange={set('side')}>
                      {TRADE_SIDES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Asset Type</label>
                    <select id="trade-asset" className="form-select" value={form.assetType} onChange={set('assetType')}>
                      {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select id="trade-status" className="form-select" value={form.status} onChange={setStatus}>
                      <option value="CLOSED">Closed</option>
                      <option value="OPEN">Open</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account</label>
                    <select id="trade-account" className="form-select" value={form.accountId} onChange={set('accountId')}>
                      <option value="">No account</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="card">
                <div className="section-title">Prices & Size</div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Entry Date & Time *</label>
                    <input id="entry-date" type="datetime-local" className="form-input" value={form.entryDate} onChange={set('entryDate')} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Exit Date & Time</label>
                    <input id="exit-date" type="datetime-local" className="form-input" value={form.exitDate} onChange={set('exitDate')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Entry Price *</label>
                    <input id="entry-price" type="number" step="0.0001" className="form-input" placeholder="0.00"
                      value={form.entryPrice} onChange={set('entryPrice')} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Exit Price</label>
                    <input id="exit-price" type="number" step="0.0001" className="form-input" placeholder="0.00"
                      value={form.exitPrice} onChange={set('exitPrice')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantity *</label>
                    <input id="quantity" type="number" step="0.01" className="form-input" placeholder="100"
                      value={form.quantity} onChange={set('quantity')} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Commission ($)</label>
                    <input id="commission" type="number" step="0.01" className="form-input" placeholder="0.00"
                      value={form.commission} onChange={set('commission')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stop Loss</label>
                    <input id="stop-loss" type="number" step="0.0001" className="form-input" placeholder="0.00"
                      value={form.stopLoss} onChange={set('stopLoss')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Take Profit</label>
                    <input id="take-profit" type="number" step="0.0001" className="form-input" placeholder="0.00"
                      value={form.takeProfit} onChange={set('takeProfit')} />
                  </div>
                </div>

                {/* P&L Section */}
                <div style={{ marginTop: 16, padding: 16, background: 'var(--card-hover)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>P&L</div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                      <span>Manual</span>
                      <div
                        onClick={() => setUseManualPnl(p => !p)}
                        style={{
                          width: 36, height: 20, borderRadius: 10,
                          background: useManualPnl ? 'var(--gold)' : 'var(--border)',
                          position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
                        }}
                      >
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%',
                          background: '#fff', position: 'absolute', top: 2,
                          left: useManualPnl ? 18 : 2, transition: 'left 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        }} />
                      </div>
                    </label>
                  </div>

                  {useManualPnl ? (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Net P&L ($)</label>
                      <input
                        id="manual-pnl"
                        type="number"
                        step="0.01"
                        className="form-input"
                        placeholder="e.g. 150.00 or -75.50"
                        value={form.manualPnl}
                        onChange={set('manualPnl')}
                        style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Space Grotesk' }}
                      />
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Auto-calculated: (exit − entry) × qty − fees</div>
                  )}

                  {pnl != null && (() => {
                    const o = tradeOutcome(pnl)
                    const isWin = o === 'WIN'
                    const isLoss = o === 'LOSS'
                    const isBe = o === 'BE'
                    return (
                    <div style={{
                      marginTop: 12, padding: 12,
                      background: isWin ? 'var(--green-muted)' : isLoss ? 'var(--red-muted)' : 'rgba(212, 175, 55, 0.08)',
                      borderRadius: 8, border: `1px solid ${isWin ? 'rgba(34,197,94,0.3)' : isLoss ? 'rgba(239,68,68,0.3)' : 'rgba(212,175,55,0.28)'}`,
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
                        {useManualPnl ? 'Manual Net P&L' : 'Estimated Net P&L'}
                        {isBe ? ' · Breakeven' : ''}
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: isWin ? 'var(--green)' : isLoss ? 'var(--red)' : 'var(--gold-primary)', fontFamily: 'Space Grotesk' }}>
                        {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}
                      </div>
                    </div>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Trade Session */}
              <div className="card">
                <div className="section-title">Trade Session</div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <select id="trade-session" className="form-select" value={form.tradeSession} onChange={set('tradeSession')}>
                    <option value="">No Session</option>
                    <option value="Pre-Market">Pre-Market</option>
                    <option value="London">London Session</option>
                    <option value="New York">New York Session</option>
                    <option value="Asian">Asian Session</option>
                    <option value="After Hours">After Hours</option>
                  </select>
                </div>
              </div>

              {/* Playbook */}
              <div className="card">
                <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                  <div className="section-title" style={{ margin: 0 }}>Strategy / Playbook</div>
                  {!creatingPlaybook && (
                    <button type="button" onClick={() => setCreatingPlaybook(true)} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: 12 }}>
                      + New
                    </button>
                  )}
                </div>
                {creatingPlaybook ? (
                  <div className="form-group">
                    <label className="form-label">New Playbook Name</label>
                    <div className="flex gap-2">
                      <input className="form-input" placeholder="e.g. Breakout Retest" value={newPlaybookName} onChange={e => setNewPlaybookName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreatePlaybook(); } }} />
                      <button type="button" onClick={handleCreatePlaybook} className="btn btn-primary btn-sm">Save</button>
                      <button type="button" onClick={() => setCreatingPlaybook(false)} className="btn btn-ghost btn-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <select id="trade-playbook" className="form-select" value={form.playbookId} onChange={set('playbookId')}>
                      <option value="">No playbook</option>
                      {playbooks.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="card">
                <div className="section-title">Tags</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input id="tag-input" className="form-input" placeholder="Add tag..." value={form.tagInput}
                    onChange={set('tagInput')}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() }}} />
                  <button type="button" onClick={addTag} className="btn btn-secondary" style={{ flexShrink: 0 }}>Add</button>
                </div>
                {form.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {form.tags.map(t => (
                      <span key={t} className="badge badge-gold" style={{ cursor: 'pointer' }} onClick={() => removeTag(t)}>
                        {t} ✕
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['Breakout', 'Reversal', 'Momentum', 'FOMO', 'Chased Entry', 'Perfect Execution', 'News Play', 'Overtraded'].map(t => (
                    !form.tags.includes(t) && (
                      <span key={t} className="tag" style={{ cursor: 'pointer' }} onClick={() => setForm(p => ({ ...p, tags: [...p.tags, t] }))}>
                        + {t}
                      </span>
                    )
                  ))}
                </div>
              </div>

              {/* Submit */}
              {error && <p className="form-error" style={{ textAlign: 'center', fontSize: 14 }}>{error}</p>}
              <div className="flex gap-3">
                <Link href="/journal" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Cancel</Link>
                <button id="save-trade" type="submit" disabled={loading}
                  className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', height: 44 }}>
                  {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Save Trade'}
                </button>
              </div>
            </div>
          </div>

          {/* Journal entry — full width below the grid */}
          <div className="card notes-full-card">
            <div className="section-title">Journal Entry</div>
            <p className="notes-full-hint">Add your chart screenshot, then write your trade journal below.</p>
            <NotesEditor value={form.notes} onChange={set('notes')} />
          </div>
        </form>
      </div>
    </>
  )
}
