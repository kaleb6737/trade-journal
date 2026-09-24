'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit, ChevronRight, X, Check } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState([])
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch_ = () => fetch('/api/playbooks').then(r => r.json()).then(d => { setPlaybooks(d.playbooks || []); setLoading(false) })
  useEffect(() => { fetch_() }, [])

  const deletePlaybook = async (id) => {
    if (!confirm('Delete this playbook?')) return
    await fetch('/api/playbooks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (selected?.id === id) setSelected(null)
    fetch_()
  }

  const COLORS = ['#E8C66A', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#EF4444', '#06B6D4']

  return (
    <>
      <div className="page-wrapper">
        <div className="page-header flex items-center justify-between">
          <div>
            <h1>Playbooks</h1>
            <p>Define and organize your trading strategies</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>
            <Plus size={16} /> New Playbook
          </button>
        </div>

        <div className="grid-2">
          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {playbooks.length === 0 && (
              <div className="empty-state">
                <span style={{ fontSize: 40 }}>📋</span>
                <h3>No playbooks yet</h3>
                <p>Create your first strategy playbook</p>
                <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">+ Create Playbook</button>
              </div>
            )}
            {playbooks.map(pb => {
              const rules = (() => { try { return JSON.parse(pb.rules || '[]') } catch { return [] } })()
              return (
                <div key={pb.id} className={`playbook-card ${selected?.id === pb.id ? 'card-gold' : ''}`}
                  onClick={() => setSelected(pb)}>
                  <div className="flex items-center gap-3" style={{ marginBottom: 10 }}>
                    <div className="playbook-dot" style={{ background: pb.color }} />
                    <span style={{ fontWeight: 700, flex: 1 }}>{pb.name}</span>
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-icon" onClick={() => { setEditing(pb); setShowModal(true) }}>
                        <Edit size={14} />
                      </button>
                      <button className="btn btn-danger btn-icon" onClick={() => deletePlaybook(pb.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  {pb.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>{pb.description}</p>}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rules.length} rules · Created {formatDate(pb.createdAt)}</div>
                </div>
              )
            })}
          </div>

          {/* Detail */}
          {selected ? (
            <PlaybookDetail playbook={selected} onClose={() => setSelected(null)} />
          ) : (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <span style={{ fontSize: 36, marginBottom: 12 }}>👈</span>
              <p style={{ color: 'var(--text-muted)', text: 'center' }}>Select a playbook to view its rules</p>
            </div>
          )}
        </div>

        {showModal && (
          <PlaybookModal
            editing={editing}
            colors={COLORS}
            onClose={() => { setShowModal(false); setEditing(null) }}
            onSave={() => { setShowModal(false); setEditing(null); fetch_() }}
          />
        )}
      </div>
    </>
  )
}

function PlaybookDetail({ playbook, onClose }) {
  const rules = (() => { try { return JSON.parse(playbook.rules || '[]') } catch { return [] } })()
  return (
    <div className="card-gold animate-fade-in">
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div className="flex items-center gap-3">
          <div className="playbook-dot" style={{ background: playbook.color, width: 14, height: 14 }} />
          <h2 style={{ fontSize: '1.1rem', fontFamily: 'Space Grotesk' }}>{playbook.name}</h2>
        </div>
        <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={16} /></button>
      </div>
      {playbook.description && <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>{playbook.description}</p>}
      <div className="gold-line" style={{ marginBottom: 20 }} />
      <div className="section-title" style={{ marginBottom: 12 }}>Rules & Checklist</div>
      {rules.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No rules defined for this playbook.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rules.map((rule, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
              background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 14 }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, border: '2px solid var(--gold-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <Check size={12} color="var(--gold-primary)" />
              </div>
              <span style={{ color: 'var(--text-primary)' }}>{rule}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PlaybookModal({ editing, colors, onClose, onSave }) {
  const [form, setForm] = useState({
    name: editing?.name || '', description: editing?.description || '',
    color: editing?.color || '#E8C66A',
    rules: (() => { try { return JSON.parse(editing?.rules || '[]') } catch { return [] } })(),
    ruleInput: '',
  })
  const [loading, setLoading] = useState(false)

  const addRule = () => {
    if (!form.ruleInput.trim()) return
    setForm(p => ({ ...p, rules: [...p.rules, p.ruleInput.trim()], ruleInput: '' }))
  }
  const removeRule = (i) => setForm(p => ({ ...p, rules: p.rules.filter((_, idx) => idx !== i) }))

  const handleSave = async () => {
    if (!form.name) return
    setLoading(true)
    const method = editing ? 'PATCH' : 'POST'
    const body = { name: form.name, description: form.description, color: form.color, rules: form.rules }
    if (editing) body.id = editing.id
    await fetch('/api/playbooks', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setLoading(false)
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{editing ? 'Edit Playbook' : 'New Playbook'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input id="pb-name" className="form-input" placeholder="e.g. Breakout Momentum"
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea id="pb-desc" className="form-textarea" style={{ minHeight: 80 }} placeholder="Describe this strategy..."
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>

          {/* Color */}
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {colors.map(c => (
                <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid white' : '2px solid transparent', boxShadow: form.color === c ? '0 0 0 2px ' + c : 'none', cursor: 'pointer' }} />
              ))}
            </div>
          </div>

          {/* Rules */}
          <div className="form-group">
            <label className="form-label">Rules / Checklist</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input id="pb-rule" className="form-input" placeholder="e.g. Must be above 20 EMA"
                value={form.ruleInput} onChange={e => setForm(p => ({ ...p, ruleInput: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRule() }}} />
              <button type="button" onClick={addRule} className="btn btn-secondary" style={{ flexShrink: 0 }}>Add</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.rules.map((rule, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                  background: 'var(--bg-elevated)', borderRadius: 6, fontSize: 13 }}>
                  <span style={{ flex: 1 }}>{rule}</span>
                  <button type="button" onClick={() => removeRule(i)} className="btn btn-ghost btn-icon" style={{ padding: 4 }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3" style={{ marginTop: 24 }}>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button id="save-playbook" onClick={handleSave} disabled={loading || !form.name} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            {loading ? 'Saving...' : editing ? 'Update Playbook' : 'Create Playbook'}
          </button>
        </div>
      </div>
    </div>
  )
}
