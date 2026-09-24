'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NotesEditor, { NotesDisplay, parseNotes } from '@/components/NotesEditor'
import { formatCurrency, formatDate, formatPercent, parseTags, getHoldTime, ASSET_TYPES, TRADE_SIDES, toMoneyNumber, tradeOutcome } from '@/lib/utils'
import { ArrowLeft, Trash2, Edit, Save, X, Eye, EyeOff } from 'lucide-react'
import EmotionCheckIn, { EmotionDisplay } from '@/components/trading/EmotionCheckIn'

export default function TradeDetailPage({ params }) {
  const { id } = params
  const router = useRouter()
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
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    fetch(`/api/trades/${id}`).then(r => r.json()).then(d => { setTrade(d.trade); setLoading(false) })
    fetch('/api/playbooks').then(r => r.json()).then(d => setPlaybooks(d.playbooks || []))
    fetch('/api/accounts').then(r => r.json()).then(d => setAccounts(d.accounts || []))
  }, [id])

  const startEdit = () => {
    const tags = parseTags(trade.tags)
    
    // Check if the trade has a manual P&L by comparing with the theoretical calculated P&L
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
    setSaveError(null)
    const payload = {
      ...form,
      entryDate: form.entryDate ? new Date(form.entryDate).toISOString() : undefined,
      exitDate:  form.exitDate  ? new Date(form.exitDate).toISOString()  : null,
      tags: form.tags,
      playbookId: form.playbookId || null,
      accountId: form.accountId || null,
      tradeSession: form.tradeSession || null,
    }
    if (useManualPnl && form.manualPnl !== '') {
      payload.manualPnl = parseFloat(form.manualPnl)
    } else if (!useManualPnl) {
      payload.manualPnl = null
    }
    const res = await fetch(`/api/trades/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) {
      setSaveError(data.error || 'Failed to save. Please try again.')
      setSaving(false)
      return
    }
    setTrade(data.trade)
    setEditing(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this trade permanently?')) return
    await fetch(`/api/trades/${id}`, { method: 'DELETE' })
    router.push('/journal')
  }

  const handleToggleHidden = async () => {
    if (!trade) return
    setEditing(false)
    setToggleHiddenBusy(true)
    try {
      const res = await fetch(`/api/trades/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: !trade.hidden }),
      })
      const data = await res.json()
      if (data.trade) setTrade(data.trade)
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
        body: JSON.stringify({ name: newPlaybookName.trim(), color: '#E8C66A' })
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

  if (loading) return <><div style={{ padding: 80, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div></>
  if (!trade)  return <><div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)' }}>Trade not found.</div></>

  const tags = parseTags(trade.tags)

  return (
    <>
      <div className="page-wrapper">
        {/* Header */}
        <div className="page-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/journal" className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 style={{ fontFamily: 'Space Grotesk', fontSize: '1.75rem' }}>{trade.symbol}</h1>
                <span className={trade.side === 'LONG' ? 'side-long' : 'side-short'}>{trade.side}</span>
                <span className="badge badge-gray">{trade.assetType}</span>
                {trade.hidden && <span className="badge badge-gray">Hidden from reports</span>}
              </div>
              <p style={{ marginTop: 4 }}>
                {formatDate(trade.entryDate)} {trade.exitDate && `→ ${formatDate(trade.exitDate)}`}
                {trade.hidden && (
                  <span style={{ display: 'block', marginTop: 8, fontSize: 14, color: 'var(--text-muted)' }}>
                    Omitted from the journal grid, dashboard, and analytics — your full journal log is below.
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!editing && <button onClick={startEdit} className="btn btn-secondary"><Edit size={15} /> Edit</button>}
            <button
              type="button"
              onClick={handleToggleHidden}
              disabled={toggleHiddenBusy}
              className="btn btn-secondary"
              title={trade.hidden ? 'Show in grid & analytics' : 'Hide from grid & analytics'}
            >
              {trade.hidden ? <Eye size={15} /> : <EyeOff size={15} />}{' '}
              {trade.hidden ? 'Unhide' : 'Hide'}
            </button>
            <button onClick={handleDelete} className="btn btn-danger"><Trash2 size={15} /> Delete</button>
          </div>
        </div>

        {!editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Trade stats row */}
            <div className="card-gold">
              <div className="grid-stats">
                {(() => {
                  const netO = trade.netPnl != null ? tradeOutcome(trade.netPnl) : null
                  const pnlColor =
                    netO === 'WIN' ? 'var(--green)' : netO === 'LOSS' ? 'var(--red)' : netO === 'BE' ? 'var(--gold-primary)' : 'var(--text-primary)'
                  const retColor =
                    trade.returnPercent == null
                      ? 'var(--text-muted)'
                      : netO === 'BE'
                        ? 'var(--gold-primary)'
                        : trade.returnPercent >= 0
                          ? 'var(--green)'
                          : 'var(--red)'
                  return [
                  { label: 'Net P&L', value: trade.netPnl != null ? formatCurrency(trade.netPnl) : '—', color: pnlColor },
                  { label: 'Gross P&L', value: trade.grossPnl != null ? formatCurrency(trade.grossPnl) : '—', color: 'var(--text-primary)' },
                  { label: 'Return %', value: trade.returnPercent != null ? formatPercent(trade.returnPercent) : '—', color: retColor },
                  { label: 'Hold Time', value: getHoldTime(trade.entryDate, trade.exitDate), color: 'var(--text-primary)' },
                  { label: 'Entry Price', value: `$${Number(trade.entryPrice).toFixed(4)}`, color: 'var(--text-primary)' },
                  { label: 'Exit Price',  value: trade.exitPrice != null ? `$${Number(trade.exitPrice).toFixed(4)}` : '—', color: 'var(--text-primary)' },
                  { label: 'Quantity', value: trade.quantity, color: 'var(--text-primary)' },
                  { label: 'Commission', value: formatCurrency(trade.commission || 0), color: 'var(--text-muted)' },
                  { label: 'Playbook', value: playbooks.find(p => p.id === trade.playbookId)?.name || 'None', color: 'var(--gold-primary)' },
                  { label: 'Session', value: trade.tradeSession || '—', color: 'var(--text-primary)' },
                ].map(s => (
                  <div key={s.label}>
                    <div className="stat-label">{s.label}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color, fontFamily: 'Space Grotesk' }}>{s.value}</div>
                  </div>
                ))
                })()}
                {trade.stopLoss && <div><div className="stat-label">Stop Loss</div><div style={{ color: 'var(--red)', fontWeight: 600 }}>${trade.stopLoss}</div></div>}
                {trade.takeProfit && <div><div className="stat-label">Take Profit</div><div style={{ color: 'var(--green)', fontWeight: 600 }}>${trade.takeProfit}</div></div>}
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="card">
                <div className="section-title">Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tags.map(t => <span key={t} className="badge badge-gold">{t}</span>)}
                </div>
              </div>
            )}

            {/* Emotion check-in */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: 16 }}>Emotional Check-in</div>
              {trade.emotionScore ? (
                <EmotionDisplay trade={trade} />
              ) : (
                <EmotionCheckIn
                  trade={trade}
                  onSaved={(updates) => setTrade(t => ({ ...t, ...updates }))}
                />
              )}
            </div>

            {/* Journal entry — full width */}
            <div className="card notes-full-card">
              <div className="section-title">Journal Entry</div>
              {(trade.notes && (parseNotes(trade.notes).text || parseNotes(trade.notes).images.length > 0)) ? (
                <NotesDisplay value={trade.notes} />
              ) : (
                <div className="empty-state" style={{ padding: '32px 0' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>No journal entry for this trade.</span>
                  <button onClick={startEdit} className="btn btn-secondary btn-sm">+ Add Entry</button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Edit Form */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
                <div className="section-title" style={{ margin: 0 }}>Editing Trade</div>
                <button onClick={() => setEditing(false)} className="btn btn-ghost btn-sm"><X size={14} /> Cancel</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  { id: 'e-symbol', label: 'Symbol', field: 'symbol', type: 'text' },
                  { id: 'e-entry-price', label: 'Entry Price', field: 'entryPrice', type: 'number' },
                  { id: 'e-exit-price', label: 'Exit Price', field: 'exitPrice', type: 'number' },
                  { id: 'e-qty', label: 'Quantity', field: 'quantity', type: 'number' },
                  { id: 'e-commission', label: 'Commission', field: 'commission', type: 'number' },
                  { id: 'e-stop', label: 'Stop Loss', field: 'stopLoss', type: 'number' },
                ].map(f => (
                  <div key={f.field} className="form-group">
                    <label className="form-label">{f.label}</label>
                    <input id={f.id} type={f.type} className="form-input" value={form[f.field] || ''} onChange={set(f.field)} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label" htmlFor="e-side">Side</label>
                  <select id="e-side" className="form-select" value={form.side} onChange={set('side')}>
                    {TRADE_SIDES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="e-asset">Asset type</label>
                  <select id="e-asset" className="form-select" value={form.assetType || 'STOCK'} onChange={set('assetType')}>
                    {ASSET_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginTop: 6 }}>
                    Market / instrument class (e.g. switch Futures → Forex if you mis-tagged the trade).
                  </span>
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0 }}>Playbook</label>
                    {!creatingPlaybook && (
                      <button type="button" onClick={() => setCreatingPlaybook(true)} className="btn btn-ghost btn-sm" style={{ padding: '0 4px', fontSize: 11, height: 'auto' }}>
                        + New
                      </button>
                    )}
                  </div>
                  {creatingPlaybook ? (
                    <div className="flex gap-2">
                      <input className="form-input" style={{ padding: '6px' }} placeholder="Name..." value={newPlaybookName} onChange={e => setNewPlaybookName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreatePlaybook(); } }} />
                      <button type="button" onClick={handleCreatePlaybook} className="btn btn-primary btn-sm" style={{ padding: '0 8px' }}>Save</button>
                      <button type="button" onClick={() => setCreatingPlaybook(false)} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }}>✕</button>
                    </div>
                  ) : (
                    <select id="e-playbook" className="form-select" value={form.playbookId || ''} onChange={set('playbookId')}>
                      <option value="">No playbook</option>
                      {playbooks.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Trade Session</label>
                  <select id="e-session" className="form-select" value={form.tradeSession || ''} onChange={set('tradeSession')}>
                    <option value="">No Session</option>
                    <option value="Pre-Market">Pre-Market</option>
                    <option value="London">London Session</option>
                    <option value="New York">New York Session</option>
                    <option value="Asian">Asian Session</option>
                    <option value="After Hours">After Hours</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select id="e-status" className="form-select" value={form.status} onChange={set('status')}>
                    <option value="CLOSED">Closed</option>
                    <option value="OPEN">Open</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Entry Date</label>
                  <input id="e-entry-date" type="datetime-local" className="form-input" value={form.entryDate || ''} onChange={set('entryDate')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Exit Date</label>
                  <input id="e-exit-date" type="datetime-local" className="form-input" value={form.exitDate || ''} onChange={set('exitDate')} />
                </div>
              </div>

              {/* Tags in edit */}
              <div style={{ marginTop: 16 }}>
                <div className="form-label" style={{ marginBottom: 8 }}>Tags</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input id="e-tag" className="form-input" placeholder="Add tag..." value={form.tagInput || ''}
                    onChange={set('tagInput')} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() }}} />
                  <button type="button" onClick={addTag} className="btn btn-secondary">Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(form.tags || []).map(t => (
                    <span key={t} className="badge badge-gold" style={{ cursor: 'pointer' }} onClick={() => removeTag(t)}>{t} ✕</span>
                  ))}
                </div>
              </div>

              {/* Manual P&L override */}
              <div style={{ marginTop: 16, padding: 16, background: 'var(--card-hover)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>P&L Override</div>
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
                      id="e-manual-pnl"
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
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>P&L will be auto-calculated from prices</div>
                )}
              </div>

            </div>

            {/* Journal entry — full width in edit */}
            <div className="card notes-full-card">
              <div className="section-title">Journal Entry</div>
              <p className="notes-full-hint">Add your chart screenshot, then write your journal below.</p>
              <NotesEditor value={form.notes || ''} onChange={set('notes')} />
            </div>

            {saveError && (
              <div style={{ color: 'var(--red)', fontSize: 13, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)' }}>
                {saveError}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setEditing(false)} className="btn btn-secondary">Cancel</button>
              <button id="save-edit" onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                {saving ? 'Saving...' : <><Save size={15} /> Save Changes</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
