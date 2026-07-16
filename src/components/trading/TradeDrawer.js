'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import NotesEditor, { NotesDisplay, parseNotes } from '@/components/NotesEditor'
import { formatCurrency, formatDate, formatPercent, parseTags, getHoldTime, ASSET_TYPES, TRADE_SIDES, toMoneyNumber, tradeOutcome } from '@/lib/utils'
import { Trash2, Edit, Save, X, ExternalLink, Eye, EyeOff } from 'lucide-react'

export default function TradeDrawer({ tradeId, onClose, onUpdate }) {
  const [trade, setTrade] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggleHiddenBusy, setToggleHiddenBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [useManualPnl, setUseManualPnl] = useState(false)
  const [playbooks, setPlaybooks] = useState([])
  const [accounts, setAccounts] = useState([])
  const [creatingPlaybook, setCreatingPlaybook] = useState(false)
  const [newPlaybookName, setNewPlaybookName] = useState('')

  // Animation states
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true) // Trigger slide-in
    fetch(`/api/trades/${tradeId}`).then(r => r.json()).then(d => { setTrade(d.trade); setLoading(false) })
    fetch('/api/playbooks').then(r => r.json()).then(d => setPlaybooks(d.playbooks || []))
    fetch('/api/accounts').then(r => r.json()).then(d => setAccounts(d.accounts || []))
  }, [tradeId])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // wait for animation
  }

  const startEdit = () => {
    const tags = parseTags(trade.tags)
    
    const dir = trade.side === 'LONG' ? 1 : -1
    const calcGross = trade.exitPrice != null ? dir * (Number(trade.exitPrice) - Number(trade.entryPrice)) * Number(trade.quantity) : null
    const calcNet = calcGross != null ? calcGross - Number(trade.commission || 0) - Number(trade.fees || 0) : null
    const hasManualPnl = trade.netPnl != null && (calcNet == null || Math.abs(Number(trade.netPnl) - calcNet) > 0.01)

    setForm({
      symbol: trade.symbol, side: trade.side, assetType: trade.assetType, status: trade.status,
      entryDate: trade.entryDate ? new Date(trade.entryDate).toISOString().slice(0, 16) : '',
      exitDate:  trade.exitDate  ? new Date(trade.exitDate).toISOString().slice(0, 16)  : '',
      entryPrice: trade.entryPrice || '', exitPrice: trade.exitPrice || '',
      quantity: trade.quantity || '', commission: trade.commission || 0, fees: trade.fees || 0,
      stopLoss: trade.stopLoss || '', takeProfit: trade.takeProfit || '',
      notes: trade.notes || '', playbookId: trade.playbookId || '', accountId: trade.accountId || '',
      tradeSession: trade.tradeSession || '',
      tags, tagInput: '', manualPnl: hasManualPnl ? trade.netPnl : '',
    })
    setUseManualPnl(hasManualPnl)
    setEditing(true)
  }

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))
  const addTag = () => {
    if (!form.tagInput?.trim()) return
    setForm(p => ({ ...p, tags: [...(p.tags || []), p.tagInput.trim()], tagInput: '' }))
  }
  const removeTag = (t) => setForm(p => ({ ...p, tags: (p.tags || []).filter(x => x !== t) }))

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      ...form,
      entryDate: form.entryDate ? new Date(form.entryDate).toISOString() : undefined,
      exitDate:  form.exitDate  ? new Date(form.exitDate).toISOString()  : null,
      tags: form.tags,
      playbookId: form.playbookId || null,
      tradeSession: form.tradeSession || null,
    }
    if (useManualPnl && form.manualPnl !== '') {
      payload.manualPnl = parseFloat(form.manualPnl)
    } else if (!useManualPnl) {
      payload.manualPnl = null
    }
    const res = await fetch(`/api/trades/${tradeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setTrade(data.trade)
    setEditing(false)
    setSaving(false)
    if (onUpdate) onUpdate()
  }

  const handleDelete = async () => {
    if (!confirm('Delete this trade permanently?')) return
    await fetch(`/api/trades/${tradeId}`, { method: 'DELETE' })
    if (onUpdate) onUpdate()
    handleClose()
  }

  const handleToggleHidden = async () => {
    if (!trade) return
    setEditing(false)
    setToggleHiddenBusy(true)
    try {
      const res = await fetch(`/api/trades/${tradeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: !trade.hidden }),
      })
      const data = await res.json()
      if (data.trade) {
        setTrade(data.trade)
        if (onUpdate) onUpdate()
      }
    } finally {
      setToggleHiddenBusy(false)
    }
  }

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

  return (
    <>
      <div 
        className={`drawer-overlay ${isVisible ? 'open' : ''}`} 
        onClick={handleClose} 
      />
      <div className={`drawer-panel ${isVisible ? 'open' : ''}`}>
        
        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : !trade ? (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)' }}>Trade not found.</div>
        ) : (
          <div className="drawer-content">
            {/* Header */}
            <div className="drawer-header">
              <div>
                <div className="flex items-center gap-3">
                  <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '1.5rem', margin: 0 }}>{trade.symbol}</h2>
                  <span className={trade.side === 'LONG' ? 'side-long' : 'side-short'}>{trade.side}</span>
                  <span className="badge badge-gray">{trade.assetType}</span>
                  {trade.hidden && <span className="badge badge-gray">Hidden from reports</span>}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
                  {formatDate(trade.entryDate)} {trade.exitDate && `→ ${formatDate(trade.exitDate)}`}
                  {trade.hidden && (
                    <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                      Omitted from the journal grid, dashboard, and analytics — your full log stays here.
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/journal/${trade.id}`} target="_blank" className="btn btn-ghost btn-icon" title="Open full page">
                  <ExternalLink size={16} />
                </Link>
                <button onClick={handleClose} className="btn btn-ghost btn-icon" title="Close">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="drawer-body">
              <div className="flex gap-2" style={{ marginBottom: 20 }}>
                {!editing && (
                  <button onClick={startEdit} className="btn btn-secondary btn-sm"><Edit size={14} /> Edit</button>
                )}
                <button
                  type="button"
                  onClick={handleToggleHidden}
                  disabled={toggleHiddenBusy}
                  className="btn btn-secondary btn-sm"
                  title={trade.hidden ? 'Show in grid & analytics' : 'Hide from grid & analytics (keep full log here)'}
                >
                  {trade.hidden ? <Eye size={14} /> : <EyeOff size={14} />}{' '}
                  {trade.hidden ? 'Unhide' : 'Hide'}
                </button>
                <button onClick={handleDelete} className="btn btn-danger btn-sm"><Trash2 size={14} /> Delete</button>
              </div>

              {!editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* Stats Grid */}
                  <div className="card-gold" style={{ padding: 20 }}>
                    <div className="grid-2" style={{ rowGap: 16 }}>
                      <div>
                        <div className="stat-label">Net P&L</div>
                        <div style={{
                          fontSize: '1.25rem',
                          fontWeight: 700,
                          color: trade.netPnl != null
                            ? (tradeOutcome(trade.netPnl) === 'WIN'
                              ? 'var(--green)'
                              : tradeOutcome(trade.netPnl) === 'LOSS'
                                ? 'var(--red)'
                                : 'var(--gold-primary)')
                            : 'var(--text-primary)',
                          fontFamily: 'Space Grotesk',
                        }}>
                          {trade.netPnl != null ? formatCurrency(trade.netPnl) : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="stat-label">Gross P&L</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
                          {trade.grossPnl != null ? formatCurrency(trade.grossPnl) : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="stat-label">Return %</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: trade.returnPercent == null ? 'var(--text-muted)' : (trade.netPnl != null && tradeOutcome(trade.netPnl) === 'BE') ? 'var(--gold-primary)' : trade.returnPercent >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {trade.returnPercent != null ? formatPercent(trade.returnPercent) : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="stat-label">Hold Time</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {getHoldTime(trade.entryDate, trade.exitDate)}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ height: 1, background: 'var(--border-gold)', opacity: 0.5, margin: '16px 0' }} />
                    
                    <div className="grid-2" style={{ rowGap: 16 }}>
                      <div><div className="stat-label">Entry</div><div style={{ fontSize: '0.95rem', fontWeight: 600 }}>${Number(trade.entryPrice).toFixed(4)}</div></div>
                      <div><div className="stat-label">Exit</div><div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{trade.exitPrice != null ? `$${Number(trade.exitPrice).toFixed(4)}` : '—'}</div></div>
                      <div><div className="stat-label">Quantity</div><div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{trade.quantity}</div></div>
                      <div><div className="stat-label">Commission</div><div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>{formatCurrency(trade.commission || 0)}</div></div>
                    </div>

                    <div style={{ height: 1, background: 'var(--border-gold)', opacity: 0.5, margin: '16px 0' }} />

                    <div className="grid-2" style={{ rowGap: 16 }}>
                      <div><div className="stat-label">Playbook</div><div style={{ fontSize: '0.9rem', color: 'var(--gold-primary)', fontWeight: 600 }}>{playbooks.find(p => p.id === trade.playbookId)?.name || 'None'}</div></div>
                      <div><div className="stat-label">Session</div><div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{trade.tradeSession || '—'}</div></div>
                    </div>
                  </div>

                  {/* Tags */}
                  {parseTags(trade.tags).length > 0 && (
                    <div className="card" style={{ padding: 20 }}>
                      <div className="section-title" style={{ fontSize: '0.95rem', marginBottom: 12 }}>Tags</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {parseTags(trade.tags).map(t => <span key={t} className="badge badge-gold">{t}</span>)}
                      </div>
                    </div>
                  )}

                  {/* Journal Notes */}
                  <div className="card notes-full-card" style={{ padding: 20 }}>
                    <div className="section-title" style={{ fontSize: '0.95rem', marginBottom: 12 }}>Journal Entry</div>
                    {(trade.notes && (parseNotes(trade.notes).text || parseNotes(trade.notes).images.length > 0)) ? (
                      <NotesDisplay value={trade.notes} />
                    ) : (
                      <div className="empty-state" style={{ padding: '24px 0', border: '1px dashed var(--border-subtle)', borderRadius: 8 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8, display: 'block' }}>No notes added.</span>
                        <button onClick={startEdit} className="btn btn-secondary btn-sm">+ Add Notes</button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="card" style={{ padding: 20 }}>
                    <div className="section-title" style={{ fontSize: '1.1rem', marginBottom: 16 }}>Editing Trade</div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Symbol</label>
                        <input type="text" className="form-input" value={form.symbol || ''} onChange={set('symbol')} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Side</label>
                        <select className="form-select" value={form.side} onChange={set('side')}>
                          {TRADE_SIDES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Asset type</label>
                        <select className="form-select" value={form.assetType || 'STOCK'} onChange={set('assetType')}>
                          {ASSET_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Entry Price</label>
                        <input type="number" className="form-input" value={form.entryPrice || ''} onChange={set('entryPrice')} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Exit Price</label>
                        <input type="number" className="form-input" value={form.exitPrice || ''} onChange={set('exitPrice')} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Quantity</label>
                        <input type="number" className="form-input" value={form.quantity || ''} onChange={set('quantity')} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Commission</label>
                        <input type="number" className="form-input" value={form.commission || ''} onChange={set('commission')} />
                      </div>
                    </div>

                    <div style={{ height: 1, background: 'var(--border-subtle)', margin: '16px 0' }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Status</label>
                        <select className="form-select" value={form.status} onChange={set('status')}>
                          <option value="CLOSED">Closed</option>
                          <option value="OPEN">Open</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Playbook</label>
                        <select className="form-select" value={form.playbookId || ''} onChange={set('playbookId')}>
                          <option value="">No playbook</option>
                          {playbooks.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Trade session</label>
                        <select className="form-select" value={form.tradeSession || ''} onChange={set('tradeSession')}>
                          <option value="">No session</option>
                          <option value="Pre-Market">Pre-Market</option>
                          <option value="London">London Session</option>
                          <option value="New York">New York Session</option>
                          <option value="Asian">Asian Session</option>
                          <option value="After Hours">After Hours</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Entry Date</label>
                        <input type="datetime-local" className="form-input" value={form.entryDate || ''} onChange={set('entryDate')} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Exit Date</label>
                        <input type="datetime-local" className="form-input" value={form.exitDate || ''} onChange={set('exitDate')} />
                      </div>
                    </div>

                    <div style={{ height: 1, background: 'var(--border-subtle)', margin: '16px 0' }} />

                    <div className="form-group">
                      <label className="form-label">Tags</label>
                      <div className="flex gap-2" style={{ marginBottom: 8 }}>
                        <input className="form-input" placeholder="Add tag..." value={form.tagInput || ''} onChange={set('tagInput')} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() }}} />
                        <button type="button" onClick={addTag} className="btn btn-secondary">Add</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(form.tags || []).map(t => (
                          <span key={t} className="badge badge-gold" style={{ cursor: 'pointer' }} onClick={() => removeTag(t)}>{t} ✕</span>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                        <span className="form-label" style={{ margin: 0 }}>P&L Override</span>
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-secondary)]">
                          <span>Manual</span>
                          <input type="checkbox" checked={useManualPnl} onChange={e => setUseManualPnl(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--gold-primary)' }} />
                        </label>
                      </div>
                      {useManualPnl && (
                        <input type="number" step="0.01" className="form-input" placeholder="Net P&L..." value={form.manualPnl} onChange={set('manualPnl')} />
                      )}
                    </div>
                  </div>

                  <div className="card" style={{ padding: 20 }}>
                    <div className="section-title" style={{ fontSize: '1.1rem', marginBottom: 12 }}>Notes</div>
                    <NotesEditor value={form.notes || ''} onChange={set('notes')} />
                  </div>

                  <div className="flex gap-3 sticky bottom-0" style={{ padding: '16px 0', background: 'var(--bg-base)', borderTop: '1px solid var(--border-subtle)', marginTop: 'auto' }}>
                    <button onClick={() => setEditing(false)} className="btn btn-secondary flex-1" style={{ justifyContent: 'center' }}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1" style={{ justifyContent: 'center' }}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
