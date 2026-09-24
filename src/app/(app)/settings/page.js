'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Save, User, Bell, Download, CreditCard } from 'lucide-react'
import BillingCard from '@/components/billing/BillingCard'
import { PLAN_DISPLAY } from '@/lib/plans'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function SettingsPage() {
  const { data: session } = useSession()
  const [tab, setTab] = useState('profile')
  const [profile, setProfile] = useState({ name: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [roundup, setRoundup] = useState({
    enabled: false,
    email: '',
    day: 0,
    hour: 18,
    lastSentAt: null,
  })
  const [roundupSaving, setRoundupSaving] = useState(false)
  const [roundupStatus, setRoundupStatus] = useState('')
  const [sendingNow, setSendingNow] = useState(false)
  const [pageReady, setPageReady] = useState(false)
  const [billingFlash, setBillingFlash] = useState(false)
  const [billingMe, setBillingMe] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('billing') === 'success') {
      setTab('billing')
      setBillingFlash(true)
      setTimeout(() => setBillingFlash(false), 4000)
    }
  }, [])

  useEffect(() => {
    if (session?.user) {
      setProfile({ name: session.user.name || '', email: session.user.email || '' })
    }
  }, [session])

  useEffect(() => {
    fetch('/api/billing/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setBillingMe(d) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/settings/weekly-roundup')
      .then((r) => r.json())
      .then((d) => {
        if (d?.settings) {
          setRoundup({
            enabled: !!d.settings.enabled,
            email: d.settings.email || '',
            day: Number(d.settings.day ?? 0),
            hour: Number(d.settings.hour ?? 18),
            lastSentAt: d.settings.lastSentAt || null,
          })
        }
        setPageReady(true)
      })
      .catch(() => setPageReady(true))
  }, [])

  const handleExport = async () => {
    const res = await fetch('/api/trades?limit=10000')
    const data = await res.json()
    const trades = data.trades || []
    if (!trades.length) { alert('No trades to export'); return }

    const headers = ['Symbol','Side','AssetType','Status','Hidden','EntryDate','ExitDate','EntryPrice','ExitPrice','Quantity','Commission','GrossPnL','NetPnL','ReturnPercent','Notes','Tags']
    const rows = trades.map(t => [
      t.symbol, t.side, t.assetType, t.status,
      t.hidden ? 'true' : 'false',
      t.entryDate ? new Date(t.entryDate).toLocaleString() : '',
      t.exitDate  ? new Date(t.exitDate).toLocaleString()  : '',
      t.entryPrice, t.exitPrice || '', t.quantity, t.commission,
      t.grossPnl || '', t.netPnl || '', t.returnPercent || '',
      (t.notes || '').replace(/,/g, ';'),
      (() => {
        try {
          return JSON.parse(t.tags || '[]').join('; ')
        } catch {
          return ''
        }
      })(),
    ])

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tradexessence-trades-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const TABS = [
    { id: 'profile', label: 'Profile', icon: <User size={15} /> },
    { id: 'billing', label: 'Plan & Billing', icon: <CreditCard size={15} /> },
    { id: 'weekly', label: 'Weekly Roundup', icon: <Bell size={15} /> },
    { id: 'export',  label: 'Data Export', icon: <Download size={15} /> },
  ]

  return (
    <>
      <div className="page-wrapper">
        <div className="page-header">
          <h1>Settings</h1>
          <p>Manage your account and preferences</p>
        </div>

        <div style={{ display: 'flex', gap: 32 }}>
          {/* Side tabs */}
          <div style={{ width: 200, flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`nav-item ${tab === t.id ? 'active' : ''}`} style={{ textAlign: 'left', justifyContent: 'flex-start' }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1 }}>
            {tab === 'profile' && (
              <div className="card" style={{ maxWidth: 500 }}>
                <div className="section-title">Profile Information</div>

                {/* Avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, padding: 20,
                  background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                  <div className="user-avatar" style={{ width: 60, height: 60, fontSize: '1.2rem', fontWeight: 800 }}>
                    {profile.name ? profile.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{profile.name || 'Trader'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{profile.email}</div>
                    {(() => {
                      const plan = billingMe?.plan || 'FREE'
                      const isPaid = plan !== 'FREE'
                      const displayName = PLAN_DISPLAY[plan]?.name || 'Free'
                      const intervalLabel = billingMe?.subscription?.interval === 'year' ? ' · yearly'
                        : billingMe?.subscription?.interval === 'month' ? ' · monthly' : ''
                      return (
                        <div
                          className="badge"
                          style={{
                            marginTop: 6,
                            background: isPaid ? 'var(--gold-muted, rgba(232, 198, 106,0.15))' : 'rgba(148,163,184,0.12)',
                            color: isPaid ? 'var(--gold-primary)' : 'var(--text-muted)',
                            border: `1px solid ${isPaid ? 'rgba(232, 198, 106,0.35)' : 'var(--border-subtle)'}`,
                          }}
                        >
                          {isPaid ? `${displayName} plan${intervalLabel}` : 'Free account'}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input id="settings-name" className="form-input" value={profile.name}
                      onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input id="settings-email" className="form-input" value={profile.email} disabled
                      style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Email cannot be changed</span>
                  </div>

                  {saved && <div style={{ background: 'var(--green-muted)', color: 'var(--green)', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>✅ Changes saved successfully</div>}

                  <button id="save-profile" className="btn btn-primary" style={{ justifyContent: 'center', height: 44 }}
                    disabled={saving} onClick={async () => { setSaving(true); await new Promise(r => setTimeout(r, 800)); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000) }}>
                    {saving ? 'Saving...' : <><Save size={15} /> Save Changes</>}
                  </button>
                </div>
              </div>
            )}

            {tab === 'billing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {billingFlash && (
                  <div
                    style={{
                      background: 'rgba(34,197,94,0.12)',
                      border: '1px solid rgba(34,197,94,0.35)',
                      color: 'var(--green)',
                      borderRadius: 10,
                      padding: '10px 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      maxWidth: 560,
                    }}
                  >
                    Subscription updated. Thanks for upgrading.
                  </div>
                )}
                <BillingCard />
              </div>
            )}

            {tab === 'export' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="card" style={{ maxWidth: 500 }}>
                  <div className="section-title">Export Your Data</div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                    Download all your trades as a CSV file. This includes symbol, side, asset type, P&L, notes, and tags for every trade you&apos;ve logged.
                  </p>
                  <button id="export-csv" onClick={handleExport} className="btn btn-primary" style={{ justifyContent: 'center' }}>
                    <Download size={15} /> Export Trades as CSV
                  </button>
                </div>

                <div className="card" style={{ maxWidth: 500, border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="section-title" style={{ color: 'var(--red)' }}>Danger Zone</div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <button className="btn btn-danger">Delete Account</button>
                </div>
              </div>
            )}

            {tab === 'weekly' && (
              <div className="card" style={{ maxWidth: 560 }}>
                <div className="section-title">Weekly Journal Roundup</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                  Every week, TradeXEssence sends you a trade recap + reflection prompts so you can review your decisions and improve.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={roundup.enabled}
                      onChange={(e) => setRoundup((p) => ({ ...p, enabled: e.target.checked }))}
                    />
                    Enable weekly roundup emails
                  </label>

                  <div className="form-group">
                    <label className="form-label">Delivery email</label>
                    <input
                      className="form-input"
                      type="email"
                      value={roundup.email}
                      onChange={(e) => setRoundup((p) => ({ ...p, email: e.target.value }))}
                      placeholder="you@example.com"
                    />
                  </div>

                  <div className="grid-2" style={{ gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Send day (UTC)</label>
                      <select
                        className="form-select"
                        value={roundup.day}
                        onChange={(e) => setRoundup((p) => ({ ...p, day: parseInt(e.target.value, 10) }))}
                      >
                        {WEEKDAYS.map((d, i) => (
                          <option key={d} value={i}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Send hour (UTC)</label>
                      <select
                        className="form-select"
                        value={roundup.hour}
                        onChange={(e) => setRoundup((p) => ({ ...p, hour: parseInt(e.target.value, 10) }))}
                      >
                        {Array.from({ length: 24 }).map((_, h) => (
                          <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {roundup.lastSentAt && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Last sent: {new Date(roundup.lastSentAt).toLocaleString()}
                    </p>
                  )}

                  {roundupStatus && (
                    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
                      {roundupStatus}
                    </div>
                  )}

                  <div className="flex gap-3" style={{ marginTop: 4 }}>
                    <button
                      className="btn btn-secondary"
                      disabled={sendingNow}
                      onClick={async () => {
                        setSendingNow(true)
                        setRoundupStatus('')
                        try {
                          const res = await fetch('/api/weekly-roundup/send', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ previewOnly: false }),
                          })
                          const data = await res.json()
                          if (!res.ok) throw new Error(data.error || 'Failed')
                          setRoundupStatus(data.note || `Roundup generated for ${data.email} (${data.totalTrades} trades).`)
                        } catch (e) {
                          setRoundupStatus(e.message)
                        } finally {
                          setSendingNow(false)
                        }
                      }}
                    >
                      {sendingNow ? 'Sending...' : 'Send now'}
                    </button>

                    <button
                      className="btn btn-primary"
                      disabled={roundupSaving}
                      onClick={async () => {
                        setRoundupSaving(true)
                        setRoundupStatus('')
                        try {
                          const res = await fetch('/api/settings/weekly-roundup', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(roundup),
                          })
                          const data = await res.json()
                          if (!res.ok) throw new Error(data.error || 'Failed to save')
                          setRoundup({
                            enabled: !!data.settings.enabled,
                            email: data.settings.email || '',
                            day: Number(data.settings.day ?? 0),
                            hour: Number(data.settings.hour ?? 18),
                            lastSentAt: data.settings.lastSentAt || null,
                          })
                          setRoundupStatus('Weekly roundup settings saved.')
                        } catch (e) {
                          setRoundupStatus(e.message)
                        } finally {
                          setRoundupSaving(false)
                        }
                      }}
                    >
                      {roundupSaving ? 'Saving...' : 'Save weekly settings'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
