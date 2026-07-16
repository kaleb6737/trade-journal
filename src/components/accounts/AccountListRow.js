'use client'

import { Edit, Trash2, Link2, RefreshCw, Unplug, Clock, KeyRound, LogIn, ExternalLink } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

function linkSummary(acc) {
  if (acc.broker === 'Alpaca') {
    if (!acc.alpacaConnected) return 'Not linked'
    return `${acc.alpacaPaper !== false ? 'Paper' : 'Live'} · …${acc.alpacaKeyLast4 || ''}`
  }
  if (acc.broker === 'Tradovate') {
    if (!acc.tradovateConnected) return 'Not linked'
    const env = acc.tradovateDemo !== false ? 'Demo' : 'Live'
    if (acc.tradovateOAuthConnected) return `${env} · OAuth`
    return `${env} · …${acc.tradovateNameLast3 || '?'}`
  }
  return '—'
}

export default function AccountListRow({
  acc,
  syncingId,
  tradovateOAuthConfigured,
  syncAlpaca,
  syncTradovate,
  setAlpacaModal,
  setTradovateModal,
  setEditing,
  setShowModal,
  deleteAccount,
  disconnectAlpaca,
  disconnectTradovate,
  patchBrokerAutoSync,
  startTradovateOAuth,
}) {
  const canSync =
    (acc.broker === 'Alpaca' && acc.alpacaConnected) ||
    (acc.broker === 'Tradovate' && acc.tradovateConnected)

  const lastSyncShort = acc.lastBrokerSyncAt
    ? new Date(acc.lastBrokerSyncAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  return (
    <div className="accounts-list-row" role="row">
      <div className="accounts-list-cell accounts-list-cell--name" role="cell">
        <div
          className="accounts-list-avatar"
          aria-hidden
        >
          {acc.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="accounts-list-name-text">
          <span className="accounts-list-name-title">{acc.name}</span>
          <span className="accounts-list-name-broker">{acc.broker}</span>
        </div>
      </div>
      <div className="accounts-list-cell accounts-list-cell--balance" role="cell">
        <span className="accounts-list-balance-val">{formatCurrency(acc.initialBalance)}</span>
        <span className="accounts-list-balance-ccy">{acc.currency}</span>
      </div>
      <div className="accounts-list-cell accounts-list-cell--link" role="cell">
        <span className="accounts-list-link-label">{linkSummary(acc)}</span>
        {acc.lastBrokerSyncError && (
          <span className="accounts-list-err" title={acc.lastBrokerSyncError}>
            Sync error
          </span>
        )}
      </div>
      <div className="accounts-list-cell accounts-list-cell--synced" role="cell">
        {lastSyncShort}
      </div>
      <div className="accounts-list-cell accounts-list-cell--auto" role="cell">
        {canSync ? (
          <label className="accounts-list-auto" title="Auto-sync fills (server cron)">
            <input
              type="checkbox"
              checked={acc.brokerAutoSyncEnabled !== false}
              onChange={e => patchBrokerAutoSync(acc, e.target.checked)}
            />
            <Clock size={12} aria-hidden />
          </label>
        ) : (
          <span className="accounts-list-dash">—</span>
        )}
      </div>
      <div className="accounts-list-cell accounts-list-cell--actions" role="cell">
        <div className="accounts-list-actions">
          {acc.broker === 'Alpaca' && (
            <>
              {acc.alpacaConnected ? (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Sync fills"
                    disabled={syncingId === acc.id}
                    onClick={() => syncAlpaca(acc.id)}
                  >
                    <RefreshCw size={15} className={syncingId === acc.id ? 'accounts-list-sync-spin' : ''} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Update API keys"
                    onClick={() => setAlpacaModal(acc)}
                  >
                    <Link2 size={15} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Disconnect Alpaca"
                    onClick={() => disconnectAlpaca(acc.id)}
                  >
                    <Unplug size={15} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  title="Connect Alpaca"
                  onClick={() => setAlpacaModal(acc)}
                >
                  <Link2 size={15} />
                </button>
              )}
            </>
          )}
          {acc.broker === 'Tradovate' && (
            <>
              {acc.tradovateConnected ? (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Sync fills"
                    disabled={syncingId === acc.id}
                    onClick={() => syncTradovate(acc.id)}
                  >
                    <RefreshCw size={15} className={syncingId === acc.id ? 'accounts-list-sync-spin' : ''} />
                  </button>
                  {!acc.tradovateOAuthConnected && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Update credentials"
                      onClick={() => setTradovateModal(acc)}
                    >
                      <Link2 size={15} />
                    </button>
                  )}
                  {tradovateOAuthConfigured && acc.tradovateOAuthConnected && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Re-link Tradovate OAuth"
                      onClick={() => {
                        const d = acc.tradovateDemo !== false ? '1' : '0'
                        window.location.href = `/api/brokers/tradovate/oauth/start?accountId=${encodeURIComponent(acc.id)}&demo=${d}`
                      }}
                    >
                      <ExternalLink size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Disconnect Tradovate"
                    onClick={() => disconnectTradovate(acc.id)}
                  >
                    <Unplug size={15} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Log in with Tradovate (OAuth)"
                    onClick={() => startTradovateOAuth(acc)}
                  >
                    <LogIn size={15} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Connect with API cid & sec"
                    onClick={() => setTradovateModal(acc)}
                  >
                    <KeyRound size={15} />
                  </button>
                </>
              )}
            </>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            title="Edit account"
            onClick={() => {
              setEditing(acc)
              setShowModal(true)
            }}
          >
            <Edit size={15} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            title="Delete account"
            onClick={() => deleteAccount(acc.id)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
