'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit, Link2, RefreshCw, Unplug, Clock, LayoutGrid, List } from 'lucide-react'
import { formatCurrency, BROKERS } from '@/lib/utils'
import AccountListRow from '@/components/accounts/AccountListRow'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [alpacaModal, setAlpacaModal] = useState(null)
  const [tradovateModal, setTradovateModal] = useState(null)
  const [syncingId, setSyncingId] = useState(null)
  const [toast, setToast] = useState(null)
  const [tradovateOAuthConfigured, setTradovateOAuthConfigured] = useState(false)
  const [accountsView, setAccountsView] = useState('gallery')
  const [pageLoading, setPageLoading] = useState(true)

  const fetch_ = () => fetch('/api/accounts').then(r => r.json()).then(d => { setAccounts(d.accounts || []); setPageLoading(false) })
  useEffect(() => { fetch_() }, [])
  useEffect(() => {
    try {
      const v = localStorage.getItem('tradexessence-accounts-view')
      if (v === 'list' || v === 'gallery') setAccountsView(v)
    } catch { /* ignore */ }
  }, [])

  const setAccountsViewMode = (mode) => {
    setAccountsView(mode)
    try {
      localStorage.setItem('tradexessence-accounts-view', mode)
    } catch { /* ignore */ }
  }
  useEffect(() => {
    fetch('/api/brokers/tradovate/oauth/config')
      .then(r => r.json())
      .then(d => setTradovateOAuthConfigured(!!d.configured))
      .catch(() => setTradovateOAuthConfigured(false))
  }, [])
  useEffect(() => {
    if (typeof window === 'undefined') return
    const p = new URLSearchParams(window.location.search)
    const tv = p.get('tradovate')
    if (tv === 'connected') {
      showToast('Tradovate linked — you can sync fills anytime.')
      window.history.replaceState({}, '', '/accounts')
      fetch_()
    } else if (tv === 'error') {
      showToast(p.get('msg') || 'Tradovate connection failed', true)
      window.history.replaceState({}, '', '/accounts')
    }
  }, [])

  const showToast = (msg, isErr) => {
    setToast({ msg, isErr })
    setTimeout(() => setToast(null), 5000)
  }

  const syncAlpaca = async (accountId) => {
    setSyncingId(accountId)
    try {
      const res = await fetch('/api/brokers/alpaca/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      showToast(`Synced: ${data.created} new trades (${data.skipped} already imported, ${data.fillCount} fills loaded).`)
      fetch_()
    } catch (e) {
      showToast(e.message, true)
    } finally {
      setSyncingId(null)
    }
  }

  const syncTradovate = async (accountId) => {
    setSyncingId(accountId)
    try {
      const res = await fetch('/api/brokers/tradovate/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      showToast(`Tradovate: ${data.created} new trades (${data.skipped} already imported, ${data.fillCount} fills).`)
      fetch_()
    } catch (e) {
      showToast(e.message, true)
    } finally {
      setSyncingId(null)
    }
  }

  const disconnectTradovate = async (accountId) => {
    if (!confirm('Disconnect Tradovate? Your imported trades stay in the journal.')) return
    const res = await fetch('/api/brokers/tradovate/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    })
    if (!res.ok) {
      const d = await res.json()
      showToast(d.error || 'Failed', true)
      return
    }
    showToast('Tradovate disconnected.')
    fetch_()
  }

  const patchBrokerAutoSync = async (acc, enabled) => {
    try {
      const res = await fetch('/api/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: acc.id, brokerAutoSyncEnabled: enabled }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      await fetch_()
      showToast(
        enabled
          ? 'Auto-sync on — new fills import on your server’s schedule (cron).'
          : 'Auto-sync off for this account.'
      )
    } catch (e) {
      showToast(e.message, true)
    }
  }

  const disconnectAlpaca = async (accountId) => {
    if (!confirm('Disconnect Alpaca? Your imported trades stay in the journal.')) return
    const res = await fetch('/api/brokers/alpaca/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    })
    if (!res.ok) {
      const d = await res.json()
      showToast(d.error || 'Failed', true)
      return
    }
    showToast('Alpaca disconnected.')
    fetch_()
  }

  const deleteAccount = async (id) => {
    if (!confirm('Delete this account? Trades linked to it will remain.')) return
    await fetch('/api/accounts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetch_()
  }

  const startTradovateOAuth = (acc) => {
    if (!tradovateOAuthConfigured) {
      showToast(
        'Add TRADOVATE_OAUTH_CLIENT_ID and TRADOVATE_OAUTH_CLIENT_SECRET to .env.local, restart dev, then try again.',
        true
      )
      return
    }
    const d = acc.tradovateDemo !== false ? '1' : '0'
    window.location.href = `/api/brokers/tradovate/oauth/start?accountId=${encodeURIComponent(acc.id)}&demo=${d}`
  }

  return (
    <>
      <div className="page-wrapper">
        <div className="page-header flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1>Accounts</h1>
            <p>Manage your broker accounts — list view for many prop / funded accounts.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="accounts-view-toggle" role="group" aria-label="Account layout">
              <button
                type="button"
                className={`btn btn-sm ${accountsView === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setAccountsViewMode('list')}
                title="List (compact)"
                aria-pressed={accountsView === 'list'}
              >
                <List size={16} aria-hidden />
                <span className="accounts-view-toggle-label">List</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${accountsView === 'gallery' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setAccountsViewMode('gallery')}
                title="Gallery (cards)"
                aria-pressed={accountsView === 'gallery'}
              >
                <LayoutGrid size={16} aria-hidden />
                <span className="accounts-view-toggle-label">Gallery</span>
              </button>
            </div>
            <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>
              <Plus size={16} /> Add Account
            </button>
          </div>
        </div>

        {accountsView === 'gallery' ? (
        <div className="grid-3">
          {accounts.map(acc => (
            <div key={acc.id} className="card" style={{ position: 'relative' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--gold-glow)', border: '1px solid var(--gold-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: 'var(--gold-primary)', fontFamily: 'Space Grotesk' }}>
                  {acc.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-icon" onClick={() => { setEditing(acc); setShowModal(true) }}>
                    <Edit size={14} />
                  </button>
                  <button className="btn btn-danger btn-icon" onClick={() => deleteAccount(acc.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{acc.name}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>{acc.broker}</div>

              {acc.broker === 'Alpaca' && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: 14,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    <Link2 size={14} style={{ color: 'var(--gold-primary)' }} />
                    Alpaca API
                  </div>
                  {acc.alpacaConnected ? (
                    <>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                        {acc.alpacaPaper !== false ? 'Paper trading' : 'Live'} · key …{acc.alpacaKeyLast4}
                      </p>
                      {acc.lastBrokerSyncAt && (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                          Last sync: {new Date(acc.lastBrokerSyncAt).toLocaleString()}
                        </p>
                      )}
                      {acc.lastBrokerSyncError && (
                        <p style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>{acc.lastBrokerSyncError}</p>
                      )}
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          fontSize: 12,
                          cursor: 'pointer',
                          marginBottom: 12,
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                          background: 'rgba(0,0,0,0.2)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={acc.brokerAutoSyncEnabled !== false}
                          onChange={e => patchBrokerAutoSync(acc, e.target.checked)}
                          style={{ marginTop: 3 }}
                        />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text-primary)' }}>
                            <Clock size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                            Auto-sync fills
                          </span>
                          <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginTop: 4, lineHeight: 1.45 }}>
                            Your host calls <code style={{ fontSize: 9 }}>/api/cron/broker-sync</code> on a timer with{' '}
                            <code style={{ fontSize: 9 }}>CRON_SECRET</code>. You can still sync manually anytime.
                          </span>
                        </span>
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={syncingId === acc.id}
                          onClick={() => syncAlpaca(acc.id)}
                        >
                          <RefreshCw size={14} style={{ opacity: syncingId === acc.id ? 0.5 : 1 }} />
                          {syncingId === acc.id ? 'Syncing…' : 'Sync fills'}
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAlpacaModal(acc)}>
                          Update keys
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => disconnectAlpaca(acc.id)}>
                          <Unplug size={14} />
                          Disconnect
                        </button>
                      </div>
                    </>
                  ) : (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setAlpacaModal(acc)}>
                      <Link2 size={14} />
                      Connect Alpaca (API keys)
                    </button>
                  )}
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.4 }}>
                    Uses your Alpaca API key &amp; secret (read). Fills are matched FIFO into closed trades. Paper &amp; live supported.
                  </p>
                </div>
              )}

              {acc.broker === 'Tradovate' && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: 14,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    <Link2 size={14} style={{ color: 'var(--gold-primary)' }} />
                    Tradovate API
                  </div>
                  {acc.tradovateConnected ? (
                    <>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                        {acc.tradovateDemo !== false ? 'Simulation (demo)' : 'Live'}
                        {acc.tradovateOAuthConnected
                          ? ' · signed in with Tradovate'
                          : acc.tradovateNameLast3
                            ? ` · user …${acc.tradovateNameLast3}`
                            : ''}
                      </p>
                      {acc.lastBrokerSyncAt && (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                          Last sync: {new Date(acc.lastBrokerSyncAt).toLocaleString()}
                        </p>
                      )}
                      {acc.lastBrokerSyncError && (
                        <p style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>{acc.lastBrokerSyncError}</p>
                      )}
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          fontSize: 12,
                          cursor: 'pointer',
                          marginBottom: 12,
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                          background: 'rgba(0,0,0,0.2)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={acc.brokerAutoSyncEnabled !== false}
                          onChange={e => patchBrokerAutoSync(acc, e.target.checked)}
                          style={{ marginTop: 3 }}
                        />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text-primary)' }}>
                            <Clock size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                            Auto-sync fills
                          </span>
                          <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginTop: 4, lineHeight: 1.45 }}>
                            Your host runs scheduled <code style={{ fontSize: 9 }}>/api/cron/broker-sync</code> with{' '}
                            <code style={{ fontSize: 9 }}>CRON_SECRET</code>. Manual sync stays available.
                          </span>
                        </span>
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={syncingId === acc.id}
                          onClick={() => syncTradovate(acc.id)}
                        >
                          <RefreshCw size={14} style={{ opacity: syncingId === acc.id ? 0.5 : 1 }} />
                          {syncingId === acc.id ? 'Syncing…' : 'Sync fills'}
                        </button>
                        {!acc.tradovateOAuthConnected && (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setTradovateModal(acc)}>
                            Update credentials
                          </button>
                        )}
                        {tradovateOAuthConfigured && acc.tradovateOAuthConnected && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              const d = acc.tradovateDemo !== false ? '1' : '0'
                              window.location.href = `/api/brokers/tradovate/oauth/start?accountId=${encodeURIComponent(acc.id)}&demo=${d}`
                            }}
                          >
                            Re-link with Tradovate
                          </button>
                        )}
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => disconnectTradovate(acc.id)}>
                          <Unplug size={14} />
                          Disconnect
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => startTradovateOAuth(acc)}
                      >
                        <Link2 size={14} />
                        Log in with Tradovate
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setTradovateModal(acc)}>
                        Connect with API cid &amp; sec
                      </button>
                    </div>
                  )}
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.4 }}>
                    {tradovateOAuthConfigured
                      ? '“Log in with Tradovate” opens trader.tradovate.com — no password stored here. Or use API cid/sec below.'
                      : '“Log in with Tradovate” needs OAuth keys in .env.local (stub lines were added for you — fill values and restart dev). Or use API cid/sec.'}
                    {' '}
                    Fills are matched FIFO into closed trades (futures-focused).
                  </p>
                </div>
              )}

              <div className="divider" style={{ margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div className="stat-label">Starting Balance</div>
                  <div style={{ fontWeight: 700, color: 'var(--gold-primary)', fontFamily: 'Space Grotesk' }}>
                    {formatCurrency(acc.initialBalance)} {acc.currency}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add new card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            border: '1px dashed var(--border-default)', cursor: 'pointer', minHeight: 180, transition: 'var(--transition)' }}
            onClick={() => { setEditing(null); setShowModal(true) }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-primary)'; e.currentTarget.style.background = 'var(--gold-glow)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'var(--bg-card)' }}>
            <Plus size={24} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Add Account</span>
          </div>
        </div>
        ) : (
        <div className="accounts-list-wrap">
          <div className="accounts-list-scroll">
            <div className="accounts-list" role="table" aria-label="Trading accounts">
              <div className="accounts-list-head" role="row">
                <div className="accounts-list-th" role="columnheader">Account</div>
                <div className="accounts-list-th" role="columnheader">Balance</div>
                <div className="accounts-list-th" role="columnheader">Broker link</div>
                <div className="accounts-list-th" role="columnheader">Last sync</div>
                <div className="accounts-list-th accounts-list-th--auto" role="columnheader" title="Auto-sync fills (cron)">Auto</div>
                <div className="accounts-list-th accounts-list-th--actions" role="columnheader">Actions</div>
              </div>
              {accounts.map(acc => (
                <AccountListRow
                  key={acc.id}
                  acc={acc}
                  syncingId={syncingId}
                  tradovateOAuthConfigured={tradovateOAuthConfigured}
                  syncAlpaca={syncAlpaca}
                  syncTradovate={syncTradovate}
                  setAlpacaModal={setAlpacaModal}
                  setTradovateModal={setTradovateModal}
                  setEditing={setEditing}
                  setShowModal={setShowModal}
                  deleteAccount={deleteAccount}
                  disconnectAlpaca={disconnectAlpaca}
                  disconnectTradovate={disconnectTradovate}
                  patchBrokerAutoSync={patchBrokerAutoSync}
                  startTradovateOAuth={startTradovateOAuth}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary accounts-list-add"
            onClick={() => { setEditing(null); setShowModal(true) }}
          >
            <Plus size={16} /> Add account
          </button>
        </div>
        )}

        {showModal && (
          <AccountModal editing={editing} onClose={() => { setShowModal(false); setEditing(null) }} onSave={() => { setShowModal(false); setEditing(null); fetch_() }} />
        )}

        {alpacaModal && (
          <AlpacaConnectModal
            account={alpacaModal}
            onClose={() => setAlpacaModal(null)}
            onSuccess={() => { setAlpacaModal(null); fetch_(); showToast('Alpaca connected.') }}
            onError={(m) => showToast(m, true)}
          />
        )}

        {tradovateModal && (
          <TradovateConnectModal
            account={tradovateModal}
            oauthConfigured={tradovateOAuthConfigured}
            onClose={() => setTradovateModal(null)}
            onSuccess={() => { setTradovateModal(null); fetch_(); showToast('Tradovate connected.') }}
            onError={(m) => showToast(m, true)}
            onHostedLoginBlocked={() =>
              showToast(
                'Paste TRADOVATE_OAUTH_CLIENT_ID and TRADOVATE_OAUTH_CLIENT_SECRET into .env.local from your Tradovate OAuth app. Redirect URI must be http://localhost:3000/api/brokers/tradovate/oauth/callback — then restart npm run dev.',
                true
              )}
          />
        )}

        {toast && (
          <div
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 300,
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              background: toast.isErr ? 'rgba(239,68,68,0.15)' : 'var(--bg-elevated)',
              border: `1px solid ${toast.isErr ? 'rgba(239,68,68,0.3)' : 'var(--border-default)'}`,
              color: 'var(--text-primary)',
              fontSize: 13,
              maxWidth: 360,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}

function TradovateConnectModal({ account, oauthConfigured, onClose, onSuccess, onError, onHostedLoginBlocked }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [cid, setCid] = useState('')
  const [sec, setSec] = useState('')
  const [demo, setDemo] = useState(account?.tradovateDemo !== false)
  const [loading, setLoading] = useState(false)

  const startOAuth = () => {
    if (!oauthConfigured) {
      onHostedLoginBlocked?.()
      return
    }
    const d = demo ? '1' : '0'
    window.location.href = `/api/brokers/tradovate/oauth/start?accountId=${encodeURIComponent(account.id)}&demo=${d}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password || cid === '' || !sec.trim()) {
      onError('Enter username, password, cid, and sec')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/brokers/tradovate/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          name: username.trim(),
          password,
          cid: parseInt(String(cid).trim(), 10),
          sec: sec.trim(),
          demo,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Connection failed')
      onSuccess()
    } catch (err) {
      onError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2 className="modal-title">Connect Tradovate</h2>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon">✕</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
          Use <strong>Continue with Tradovate</strong> to sign in on Tradovate’s site (needs OAuth keys in server env), or fill in API cid/sec below.
        </p>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={demo} onChange={e => setDemo(e.target.checked)} />
            Simulation (demo) account
          </label>
          <button
            type="button"
            className={`btn ${oauthConfigured ? 'btn-primary' : 'btn-secondary'}`}
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={startOAuth}
          >
            <Link2 size={16} />
            Continue with Tradovate
          </button>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center', lineHeight: 1.45 }}>
            {oauthConfigured
              ? 'Opens trader.tradovate.com — you approve access, then return here.'
              : 'Not configured yet: set TRADOVATE_OAUTH_CLIENT_ID and SECRET in .env.local, restart dev — or use the form below.'}
          </p>
          <div style={{ margin: '18px 0', borderTop: '1px solid var(--border-subtle)' }} />
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>Or API username + cid &amp; sec</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="tv-user">Tradovate username</label>
            <input id="tv-user" className="form-input" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="tv-pass">Password</label>
            <input id="tv-pass" type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="tv-cid">API cid (number)</label>
              <input id="tv-cid" className="form-input" inputMode="numeric" value={cid} onChange={e => setCid(e.target.value)} placeholder="e.g. 8" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tv-sec">API sec (secret)</label>
              <input id="tv-sec" type="password" className="form-input" value={sec} onChange={e => setSec(e.target.value)} autoComplete="new-password" />
            </div>
          </div>
          <div className="flex gap-3" style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Verifying…' : 'Save & connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AlpacaConnectModal({ account, onClose, onSuccess, onError }) {
  const [keyId, setKeyId] = useState('')
  const [secret, setSecret] = useState('')
  const [paper, setPaper] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!keyId.trim() || !secret.trim()) {
      onError('Enter API Key ID and Secret')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/brokers/alpaca/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          keyId: keyId.trim(),
          secret: secret.trim(),
          paper,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Connection failed')
      onSuccess()
    } catch (err) {
      onError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h2 className="modal-title">Connect Alpaca</h2>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon">✕</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
          Create keys in the Alpaca dashboard (paper or live). Keys are encrypted at rest. We only call Alpaca to verify and to sync fills.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="alpaca-key">API Key ID</label>
            <input id="alpaca-key" className="form-input" value={keyId} onChange={e => setKeyId(e.target.value)} autoComplete="off" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="alpaca-secret">Secret key</label>
            <input id="alpaca-secret" type="password" className="form-input" value={secret} onChange={e => setSecret(e.target.value)} autoComplete="new-password" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={paper} onChange={e => setPaper(e.target.checked)} />
            Paper trading endpoint (recommended for testing)
          </label>
          <div className="flex gap-3" style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Verifying…' : 'Save & connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AccountModal({ editing, onClose, onSave }) {
  const [form, setForm] = useState({
    name: editing?.name || '', broker: editing?.broker || 'Manual',
    currency: editing?.currency || 'USD', initialBalance: editing?.initialBalance || '',
  })
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!form.name) return
    setLoading(true)
    const method = editing ? 'PATCH' : 'POST'
    const body = { ...form }
    if (editing) body.id = editing.id
    await fetch('/api/accounts', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setLoading(false)
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2 className="modal-title">{editing ? 'Edit Account' : 'Add Account'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Account Name *</label>
            <input id="acc-name" className="form-input" placeholder="e.g. Main Trading Account"
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Broker</label>
            <select id="acc-broker" className="form-select" value={form.broker} onChange={e => setForm(p => ({ ...p, broker: e.target.value }))}>
              {BROKERS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select id="acc-currency" className="form-select" value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                {['USD', 'EUR', 'GBP', 'CAD', 'JPY', 'AUD'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Starting Balance</label>
              <input id="acc-balance" type="number" className="form-input" placeholder="10000"
                value={form.initialBalance} onChange={e => setForm(p => ({ ...p, initialBalance: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="flex gap-3" style={{ marginTop: 24 }}>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button id="save-account" onClick={handleSave} disabled={loading || !form.name} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            {loading ? 'Saving...' : editing ? 'Update Account' : 'Add Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
