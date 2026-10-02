'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit, ChevronRight, X, Check, RotateCcw, ListChecks, BookOpen } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import FormattedText, { plainText, renderInline } from '@/components/FormattedText'

const COLORS = ['#E8C66A', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#EF4444', '#06B6D4']
const parseRules = (raw) => { try { return JSON.parse(raw || '[]') } catch { return [] } }

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  // Derived, so edits show up in the open detail panel right after saving.
  const selected = playbooks.find((p) => p.id === selectedId) || null

  const load = () => fetch('/api/playbooks').then(r => r.json()).then(d => { setPlaybooks(d.playbooks || []); setLoading(false) })
  useEffect(() => { load() }, [])

  const deletePlaybook = async (id) => {
    if (!confirm('Delete this playbook?')) return
    await fetch('/api/playbooks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (selectedId === id) setSelectedId(null)
    load()
  }

  const openEditor = (pb) => { setEditing(pb); setShowModal(true) }

  return (
    <div className="page-wrapper">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Playbooks</h1>
          <p>Define and organize your trading strategies</p>
        </div>
        <button className="btn btn-primary" onClick={() => openEditor(null)}>
          <Plus size={16} /> New Playbook
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <div className="pb-layout">
          <div className="pb-list">
            {playbooks.length === 0 && (
              <div className="empty-state">
                <BookOpen size={36} style={{ color: 'var(--gold-primary)' }} />
                <h3>No playbooks yet</h3>
                <p>Write down your setups once, then tag trades with them to see which ones actually pay.</p>
                <button onClick={() => openEditor(null)} className="btn btn-primary btn-sm">+ Create Playbook</button>
              </div>
            )}
            {playbooks.map(pb => {
              const rules = parseRules(pb.rules)
              const preview = plainText(pb.description)
              return (
                <div
                  key={pb.id}
                  className={`playbook-card pb-card${selectedId === pb.id ? ' pb-card--active' : ''}`}
                  style={{ '--pb-color': pb.color }}
                  onClick={() => setSelectedId(pb.id)}
                >
                  <div className="pb-card-head">
                    <div className="playbook-dot" style={{ background: pb.color }} />
                    <span className="pb-card-name">{pb.name}</span>
                    <div className="pb-card-actions" onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-icon" title="Edit" onClick={() => openEditor(pb)}><Edit size={14} /></button>
                      <button className="btn btn-danger btn-icon" title="Delete" onClick={() => deletePlaybook(pb.id)}><Trash2 size={14} /></button>
                    </div>
                    <ChevronRight size={16} className="pb-card-chevron" />
                  </div>
                  {preview && <p className="pb-card-preview">{preview}</p>}
                  <div className="pb-card-meta">
                    <span className="pb-chip"><ListChecks size={12} /> {rules.length} rule{rules.length === 1 ? '' : 's'}</span>
                    <span>Created {formatDate(pb.createdAt)}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {selected ? (
            <PlaybookDetail key={selected.id} playbook={selected} onClose={() => setSelectedId(null)} onEdit={() => openEditor(selected)} />
          ) : playbooks.length > 0 && (
            <div className="card pb-placeholder">
              <BookOpen size={32} style={{ color: 'var(--text-muted)' }} />
              <p>Select a playbook to see its strategy and checklist</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <PlaybookModal
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSave={(saved) => { setShowModal(false); setEditing(null); load(); if (saved?.id) setSelectedId(saved.id) }}
        />
      )}
    </div>
  )
}

function PlaybookDetail({ playbook, onClose, onEdit }) {
  const rules = parseRules(playbook.rules)
  const [checked, setChecked] = useState(() => new Set())
  const toggle = (i) => setChecked(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next })
  const done = checked.size

  return (
    <div className="card-gold pb-detail animate-fade-in" style={{ '--pb-color': playbook.color }}>
      <div className="pb-detail-head">
        <div className="pb-detail-title">
          <div className="playbook-dot" style={{ background: playbook.color, width: 14, height: 14 }} />
          <h2>{playbook.name}</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="btn btn-ghost btn-sm"><Edit size={14} /> Edit</button>
          <button onClick={onClose} className="btn btn-ghost btn-icon" title="Close"><X size={16} /></button>
        </div>
      </div>
      <div className="pb-detail-meta">
        {rules.length} rule{rules.length === 1 ? '' : 's'} · Created {formatDate(playbook.createdAt)}
      </div>

      <section className="pb-section">
        <div className="section-title">Strategy</div>
        {playbook.description?.trim()
          ? <FormattedText text={playbook.description} className="pb-description" />
          : <p className="pb-empty">No description yet. <button className="pb-link" onClick={onEdit}>Add one</button> — what the setup is, when it works, and when to skip it.</p>}
      </section>

      <div className="gold-line" />

      <section className="pb-section">
        <div className="pb-checklist-head">
          <div className="section-title" style={{ margin: 0 }}>Rules &amp; Checklist</div>
          {rules.length > 0 && (
            <div className="pb-checklist-progress">
              <span className={done === rules.length ? 'pnl-positive' : ''}>{done}/{rules.length} checked</span>
              {done > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setChecked(new Set())} title="Clear checks"><RotateCcw size={12} /></button>}
            </div>
          )}
        </div>
        {rules.length === 0 ? (
          <p className="pb-empty">No rules yet. <button className="pb-link" onClick={onEdit}>Add your entry and exit rules</button> so you can tick them off before each trade.</p>
        ) : (
          <ol className="pb-rules">
            {rules.map((rule, i) => (
              <li key={i}>
                <button type="button" className={`pb-rule${checked.has(i) ? ' pb-rule--checked' : ''}`} onClick={() => toggle(i)} aria-pressed={checked.has(i)}>
                  <span className="pb-rule-num">{i + 1}</span>
                  <span className="pb-rule-text">{renderInline(rule)}</span>
                  <span className="pb-rule-box">{checked.has(i) && <Check size={12} strokeWidth={3} />}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

function PlaybookModal({ editing, onClose, onSave }) {
  const [form, setForm] = useState({
    name: editing?.name || '', description: editing?.description || '',
    color: editing?.color || '#E8C66A',
    rules: parseRules(editing?.rules),
    ruleInput: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Pasting several lines adds one rule per line (list markers stripped).
  const addRule = () => {
    const items = form.ruleInput.split('\n').map(l => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim()).filter(Boolean)
    if (!items.length) return
    setForm(p => ({ ...p, rules: [...p.rules, ...items], ruleInput: '' }))
  }
  const removeRule = (i) => setForm(p => ({ ...p, rules: p.rules.filter((_, idx) => idx !== i) }))
  const moveRule = (i, dir) => setForm(p => {
    const rules = [...p.rules]
    const j = i + dir
    if (j < 0 || j >= rules.length) return p
    ;[rules[i], rules[j]] = [rules[j], rules[i]]
    return { ...p, rules }
  })

  const handleSave = async () => {
    if (!form.name.trim()) return
    setLoading(true)
    setError('')
    const body = { name: form.name.trim(), description: form.description, color: form.color, rules: form.rules }
    if (editing) body.id = editing.id
    try {
      const res = await fetch('/api/playbooks', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not save the playbook.')
      onSave(data.playbook || (editing ? { id: editing.id } : null))
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal pb-modal">
        <div className="modal-header">
          <h2 className="modal-title">{editing ? 'Edit Playbook' : 'New Playbook'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">✕</button>
        </div>

        <div className="pb-modal-body">
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input id="pb-name" className="form-input" placeholder="e.g. Silver Bullet — refined"
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>

          <div className="form-group">
            <label className="form-label">Strategy description</label>
            <textarea id="pb-desc" className="form-textarea pb-desc-input" rows={8}
              placeholder={'What the setup is, when it works, and when to skip it.\n\nEntry criteria:\n- Sweep of the 9 AM low\n- iFVG + breaker on the 1-minute'}
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            <p className="pb-format-hint">
              Blank line = new paragraph · <code>- </code> bullets · <code>1.</code> numbered · <code>Heading:</code> on its own line · <code>**bold**</code>
            </p>
            {form.description.trim() && (
              <div className="pb-preview">
                <div className="pb-preview-label">Preview</div>
                <FormattedText text={form.description} className="pb-description" />
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="pb-colors">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))} aria-label={`Color ${c}`}
                  className={`pb-color${form.color === c ? ' pb-color--active' : ''}`} style={{ background: c, '--pb-color': c }} />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Rules / Checklist</label>
            <div className="pb-rule-add">
              <textarea id="pb-rule" className="form-textarea" rows={2} placeholder="e.g. Only take the trade on the 5-minute MSS (paste several lines to add several rules)"
                value={form.ruleInput} onChange={e => setForm(p => ({ ...p, ruleInput: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addRule() } }} />
              <button type="button" onClick={addRule} className="btn btn-secondary">Add</button>
            </div>
            {form.rules.length > 0 && (
              <ol className="pb-rules pb-rules--edit">
                {form.rules.map((rule, i) => (
                  <li key={i} className="pb-rule-edit">
                    <span className="pb-rule-num">{i + 1}</span>
                    <span className="pb-rule-text">{renderInline(rule)}</span>
                    <span className="pb-rule-edit-actions">
                      <button type="button" onClick={() => moveRule(i, -1)} disabled={i === 0} className="btn btn-ghost btn-icon" title="Move up">↑</button>
                      <button type="button" onClick={() => moveRule(i, 1)} disabled={i === form.rules.length - 1} className="btn btn-ghost btn-icon" title="Move down">↓</button>
                      <button type="button" onClick={() => removeRule(i)} className="btn btn-ghost btn-icon" title="Remove"><X size={12} /></button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {error && <p className="form-error" style={{ marginTop: 12 }}>{error}</p>}
        <div className="flex gap-3" style={{ marginTop: 20 }}>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button id="save-playbook" onClick={handleSave} disabled={loading || !form.name.trim()} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            {loading ? 'Saving...' : editing ? 'Update Playbook' : 'Create Playbook'}
          </button>
        </div>
      </div>
    </div>
  )
}
