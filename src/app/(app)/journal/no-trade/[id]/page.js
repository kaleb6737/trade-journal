'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { NotesDisplay, parseNotes } from '@/components/NotesEditor'
import { parseTags } from '@/lib/utils'
import { ArrowLeft, Trash2, Edit, CalendarOff } from 'lucide-react'

// Stored as UTC midnight of the calendar day — format from the ISO date so the
// viewer's timezone can't shift it to the previous day.
function dayLabel(isoDate) {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export default function NoTradeDayPage({ params }) {
  const { id } = params
  const router = useRouter()
  const [entry, setEntry] = useState(null)
  const [status, setStatus] = useState('loading')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/no-trade-days/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { setEntry(d.noTradeDay); setStatus('ready') })
      .catch((code) => setStatus(code === 404 ? 'missing' : 'error'))
  }, [id])

  const remove = async () => {
    if (!confirm('Delete this no-trade day journal?')) return
    setDeleting(true)
    const r = await fetch(`/api/no-trade-days/${id}`, { method: 'DELETE' })
    if (r.ok) router.push('/journal')
    else setDeleting(false)
  }

  if (status === 'loading') {
    return <div className="page-wrapper" style={{ padding: 100, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
  }
  if (status !== 'ready') {
    return (
      <div className="page-wrapper">
        <Link href="/journal" className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Back to journal</Link>
        <div className="card" style={{ marginTop: 20, textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          {status === 'missing' ? 'This no-trade day was not found. It may have been deleted.' : 'Could not load this entry. Try again.'}
        </div>
      </div>
    )
  }

  const tags = parseTags(entry.tags)
  const notes = parseNotes(entry.reason)
  const hasNotes = notes.images.length > 0 || notes.html.replace(/<[^>]+>/g, '').trim().length > 0
  const dayKey = entry.date.slice(0, 10)

  return (
    <div className="page-wrapper">
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/journal" className="btn btn-ghost btn-icon" aria-label="Back to journal"><ArrowLeft size={18} /></Link>
          <div>
            <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
              <CalendarOff size={16} style={{ color: 'var(--text-muted)' }} aria-hidden />
              <span className="badge badge-gray">No Trade Day</span>
            </div>
            <h1>{dayLabel(entry.date)}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/journal/new?date=${dayKey}`} className="btn btn-secondary btn-sm"><Edit size={14} /> Edit</Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={remove} disabled={deleting}><Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete'}</button>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title">Reasons</div>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            {tags.map((t) => <span key={t} className="badge badge-gold">{t}</span>)}
          </div>
        </div>
      )}

      <div className="card notes-full-card">
        <div className="section-title">Journal</div>
        {hasNotes
          ? <NotesDisplay value={entry.reason} />
          : <p style={{ color: 'var(--text-muted)', margin: 0 }}>No journal written for this day. <Link href={`/journal/new?date=${dayKey}`} style={{ color: 'var(--gold-primary)' }}>Add one</Link>.</p>}
      </div>
    </div>
  )
}
