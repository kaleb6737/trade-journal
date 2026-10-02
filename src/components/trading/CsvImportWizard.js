'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CSV_FIELDS, CSV_PROFILES, CSV_TEMPLATE, suggestMapping } from '@/lib/csvProfiles'
import { CSV_MAX_BYTES, prepareCsv, readCsv } from '@/lib/csvImport'

const initialOptions = { assetType: 'FUTURES', dateOrder: 'YMD', utcOffset: '', pnlMode: '', decimal: 'dot', costMode: 'cost' }
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }

const STEP_LABEL = { 1: 'Choose platform', 2: 'Upload & map columns', 3: 'Review & import' }

export default function CsvImportWizard({ onClose, onImport, onEmotionRate, renderTradovate }) {
  const [step, setStep] = useState(1)
  const [profileId, setProfileId] = useState('')
  const [legacy, setLegacy] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [accountId, setAccountId] = useState('')
  const [accountError, setAccountError] = useState('')
  const [text, setText] = useState('')
  const [headers, setHeaders] = useState([])
  const [filename, setFilename] = useState('')
  const [mapping, setMapping] = useState({})
  const [options, setOptions] = useState(initialOptions)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [result, setResult] = useState(null)
  const readVersion = useRef(0)
  const submitting = useRef(false)
  const dialog = useRef(null)
  const profile = CSV_PROFILES.find(p => p.id === profileId)
  const account = accounts.find(a => a.id === accountId)

  useEffect(() => {
    let active = true
    fetch('/api/accounts').then(async r => {
      if (!r.ok) throw new Error('Could not load your accounts. Close and reopen the importer to retry.')
      return r.json()
    }).then(d => { if (active) setAccounts(d.accounts || []) })
      .catch(e => { if (active) setAccountError(e.message) })
    return () => { active = false; readVersion.current++ }
  }, [])

  useEffect(() => {
    const previous = document.activeElement
    dialog.current?.focus()
    return () => previous?.focus?.()
  }, [legacy])

  const preview = useMemo(() => {
    if (!text) return null
    try { return prepareCsv(text, profileId, mapping, options) }
    catch (e) { return { error: e.message } }
  }, [text, profileId, mapping, options])

  function choose(id) {
    readVersion.current++
    setProfileId(id); setText(''); setHeaders([]); setMapping({}); setFilename('')
    setError(''); setResult(null); setConfirmed(false); setReading(false)
    setOptions({ ...initialOptions, assetType: CSV_PROFILES.find(p => p.id === id)?.asset || 'STOCK' })
  }

  async function upload(file) {
    const version = ++readVersion.current
    setError(''); setText(''); setHeaders([]); setMapping({}); setConfirmed(false); setFilename('')
    if (!file) return
    if (!/\.csv$/i.test(file.name) || file.size > CSV_MAX_BYTES) { setError('Choose a .csv file up to 2 MB. HTML, PDF and XLSX files must be converted, not renamed.'); return }
    setReading(true)
    try {
      const value = await file.text()
      if (version !== readVersion.current) return
      const parsed = readCsv(value)
      setText(value); setHeaders(parsed.headers); setMapping(suggestMapping(parsed.headers, profileId)); setFilename(file.name)
    } catch (e) { if (version === readVersion.current) setError(e.message) }
    finally { if (version === readVersion.current) setReading(false) }
  }

  function option(name, value) { setOptions(o => ({ ...o, [name]: value })); setConfirmed(false) }
  function download() {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'tradexessence-closed-trades-template.csv'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function submit() {
    if (submitting.current || !confirmed || !accountId || !preview?.trades?.length || preview.errors.length) return
    submitting.current = true; setBusy(true); setError('')
    try {
      const r = await fetch('/api/trades/import', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: text, profile: profileId, mapping, options, accountId }) })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Import failed. No trades were saved.')
      setResult(data)
      onImport()
    } catch (e) { setError(`${e.message} If the connection dropped, retrying the same file is safe.`) }
    finally { submitting.current = false; setBusy(false) }
  }

  function keyDown(e) {
    if (e.key === 'Escape' && !busy && !reading) onClose()
    if (e.key !== 'Tab') return
    const els = dialog.current?.querySelectorAll('button:not(:disabled), select:not(:disabled), input:not(:disabled), a[href]')
    if (!els?.length) return
    const first = els[0], last = els[els.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  if (legacy) return renderTradovate(() => setLegacy(false))
  const changeMapping = (field, value) => { setMapping(m => ({ ...m, [field]: value })); setConfirmed(false) }
  const canReview = !!accountId && !!preview?.trades && !preview?.error
  const goToStep = (n) => { setError(''); setStep(n) }

  return <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !busy && !reading) onClose() }}>
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="csv-title" ref={dialog} tabIndex={-1} onKeyDown={keyDown}
      style={{ width: 'min(900px, 95vw)', maxWidth: 900, maxHeight: '90vh', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="modal-header" style={{ padding: '28px 32px 0', marginBottom: 0, flexShrink: 0 }}>
        <div>
          <h2 id="csv-title" className="modal-title">Import your trades</h2>
          {!result && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Step {step} of 3 · {STEP_LABEL[step]}</div>}
        </div>
        <button className="btn btn-ghost" aria-label="Close import" disabled={busy || reading} onClick={onClose}>✕</button>
      </div>

      <div style={{ padding: '20px 32px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
      {result ? <div aria-live="polite">
        <h3>Import complete</h3><p>{result.created} trades added · {result.skipped} already imported</p>
        <p>Saved to {account?.name}. Keep your source report for reconciliation.</p>
        <div className="flex gap-3">
          {!!result.ids?.length && <button className="btn btn-primary" onClick={() => { onClose(); onEmotionRate(result.ids) }}>Rate your emotions</button>}
          <button className="btn btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div> : step === 1 ? <>
        <p style={{ color: 'var(--text-secondary)' }}>Where did you place these trades? Choose the trading platform, even if the account belongs to a prop firm.</p>
        <label className="form-label" htmlFor="csv-platform">Broker / trading platform</label>
        <select id="csv-platform" className="form-input" value={profileId} onChange={e => choose(e.target.value)}>
          <option value="">Choose a platform…</option>
          {['Futures', 'Multi-asset', 'Forex platforms', 'Other'].map(group => <optgroup key={group} label={group}>
            {CSV_PROFILES.filter(p => p.group === group).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </optgroup>)}
        </select>
        {profile?.legacy && <div style={{ marginTop: 20 }}><p>Your existing Tradovate importer is unchanged.</p>
          <button className="btn btn-primary" onClick={() => setLegacy(true)}>Continue with Tradovate</button></div>}
      </> : step === 2 ? <fieldset disabled={busy || reading} style={{ border: 0, padding: 0, minWidth: 0 }}>
            <section style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 12, margin: '0 0 18px' }}>
              <h3>{profile.name}: export guide</h3><p>{profile.description}</p>
              <ol>{profile.steps.map(s => <li key={s} style={{ margin: '8px 0' }}>{s}</li>)}</ol>
              {profile.source && <a href={profile.source} target="_blank" rel="noopener noreferrer">Official platform guide ↗</a>}
              <p style={{ fontSize: 13 }}>Guided import: suggested columns must be reviewed. Native report versions have not all been verified with real exports. Only completed trades are accepted; no automatic fill pairing.</p>
              <button className="btn btn-secondary" type="button" onClick={download}>Download blank CSV template</button>
            </section>
            {accountError && <p role="alert">{accountError}</p>}
            <div style={grid}>
              <label className="form-label">Save trades to account
                <select className="form-input" value={accountId} onChange={e => { setAccountId(e.target.value); setConfirmed(false) }}>
                  <option value="">Choose a journal account…</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}
                </select>
              </label>
              <label className="form-label">CSV file (up to 2 MB / 2,000 rows)
                <input key={profileId} className="form-input" type="file" accept=".csv,text/csv" onChange={e => upload(e.target.files?.[0])} />
              </label>
            </div>
            {!accounts.length && !accountError && <p>Create a trading account on the <a href="/accounts">Accounts page</a> if you do not have one yet.</p>}
            <p style={{ fontSize: 13 }}>Upload one account and one asset type at a time. P&L must be in the destination account currency; no currency conversion is performed. Do not include account passwords.</p>
            {reading && <p role="status">Reading CSV…</p>}
            {((error && !preview?.trades) || preview?.error) && <p role="alert" style={{ color: 'var(--red)', marginTop: 16 }}>{error || preview.error}</p>}
            {headers.length > 0 && <>
              <h3>Match columns · {filename}</h3>
              <p>Check every suggestion. Required fields are marked *. Each row must contain both sides of a completed trade.</p>
              <div style={grid}>{CSV_FIELDS.map(([field, label, required]) => <label className="form-label" key={field}>{label}{required ? ' *' : ''}
                <select className="form-input" value={mapping[field] || ''} onChange={e => changeMapping(field, e.target.value)}>
                  <option value="">{required ? 'Choose column…' : 'Not included'}</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select></label>)}</div>
              <h3 style={{ marginTop: 20 }}>Interpret your report</h3>
              <div style={grid}>
                <label className="form-label">Asset type<select className="form-input" value={options.assetType} onChange={e => option('assetType', e.target.value)}>{['FUTURES','FOREX','STOCK','OPTIONS','CRYPTO'].map(v => <option key={v}>{v}</option>)}</select></label>
                <label className="form-label">Date order<select className="form-input" value={options.dateOrder} onChange={e => option('dateOrder', e.target.value)}><option value="YMD">Year / month / day</option><option value="MDY">Month / day / year</option><option value="DMY">Day / month / year</option></select></label>
                <label className="form-label">Export UTC offset<input className="form-input" placeholder="e.g. -04:00 or +02:00" value={options.utcOffset} onChange={e => option('utcOffset', e.target.value)} /></label>
                <label className="form-label">Reported P&L<select className="form-input" value={options.pnlMode} onChange={e => option('pnlMode', e.target.value)}><option value="">Choose explicitly…</option><option value="net">Net: already includes all costs and swap</option><option value="gross">Gross: subtract costs, add signed swap</option></select></label>
                <label className="form-label">Number format<select className="form-input" value={options.decimal} onChange={e => option('decimal', e.target.value)}><option value="dot">1,234.56 (decimal point)</option><option value="comma">1.234,56 (decimal comma)</option></select></label>
                <label className="form-label">Commission / fee convention<select className="form-input" value={options.costMode} onChange={e => option('costMode', e.target.value)}><option value="cost">Positive amounts are charges</option><option value="signed">Negative charges / positive rebates</option></select></label>
              </div>
              <p style={{ fontSize: 13 }}>Offsets embedded in timestamps take precedence. For timestamps without offsets, split exports at daylight-saving changes. Swap is always signed: negative charge, positive credit. Missing optional costs are treated as zero.</p>
            </>}
        </fieldset> : <>
        {preview?.trades && <section aria-live="polite">
          <h3>Review before saving</h3>
          <p>{preview.totalRows} rows · {preview.trades.length} valid · {preview.errors.length} need correction</p>
          <p>Valid-row net P&L: {preview.netPnl.toFixed(2)} {account?.currency || '(choose account)'}</p>
          {!!preview.errors.length && <div role="alert"><p>No rows will be saved until all errors are corrected. Go back to fix the column mapping or options.</p><ul>{preview.errors.slice(0, 10).map(e => <li key={e.row}>Row {e.row}: {e.message}</li>)}</ul>{preview.errors.length > 10 && <p>Showing the first 10 errors.</p>}</div>}
          <div style={{ overflowX: 'auto' }}><table className="table" style={{ width: '100%', textAlign: 'left' }}><thead><tr>{['Symbol','Side','Entry (UTC)','Exit (UTC)','Quantity','Net P&L'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{preview.trades.slice(0, 5).map(t => <tr key={t.sourceRow}><td>{t.symbol}</td><td>{t.side}</td><td>{t.entryDate}</td><td>{t.exitDate}</td><td>{t.quantity}</td><td>{t.manualPnl.toFixed(2)}</td></tr>)}</tbody></table></div>
          <p style={{ fontSize: 13 }}>First five valid rows shown. Re-uploading the same file to the same account/platform skips previously imported rows. Overlapping exports or broker-sync trades are not automatically deduplicated.</p>
        </section>}
      </>}
      </div>

      {!result && !(step === 1 && profile?.legacy) && (
        <div style={{ flexShrink: 0, padding: '16px 32px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
          {step === 3 && error && <p role="alert" style={{ color: 'var(--red)', marginBottom: 12 }}>{error}</p>}
          {step === 3 && <label style={{ display: 'flex', gap: 10, marginBottom: 14 }}><input type="checkbox" disabled={busy} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I checked the complete row count, net total, currency, dates, source quantity units and cost settings against my report.</label>}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            {step > 1 ? <button className="btn btn-secondary" disabled={busy} onClick={() => goToStep(step - 1)}>← Back</button> : <span />}
            {step === 1 && <button className="btn btn-primary" disabled={!profileId || profile?.legacy} onClick={() => goToStep(2)}>Continue →</button>}
            {step === 2 && <button className="btn btn-primary" disabled={!canReview} onClick={() => goToStep(3)}>Continue to review →</button>}
            {step === 3 && <button className="btn btn-primary" disabled={busy || !confirmed || !accountId || !preview?.trades?.length || !!preview?.errors?.length} onClick={submit}>{busy ? 'Saving…' : `Import ${preview?.trades?.length || 0} trades`}</button>}
          </div>
        </div>
      )}
    </div>
  </div>
}
