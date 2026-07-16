import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  formatDictationWithGemini,
  isDictationAiConfigured,
} from '@/lib/formatDictationGemini'

/** Public: only whether GEMINI_API_KEY is set (no secret leaked). Used to enable the toolbar toggle. */
export async function GET() {
  return NextResponse.json({ configured: isDictationAiConfigured() })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isDictationAiConfigured()) {
    return NextResponse.json(
      { error: 'AI dictation organizer is not configured — set GEMINI_API_KEY in .env.local (not .env.example) and restart the dev server.' },
      { status: 503 }
    )
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const text = typeof body?.text === 'string' ? body.text : ''
  if (!text.trim()) {
    return NextResponse.json({ error: 'Missing or empty "text"' }, { status: 400 })
  }

  try {
    const html = await formatDictationWithGemini(text)
    if (!html) {
      return NextResponse.json({ error: 'Could not produce HTML' }, { status: 422 })
    }
    return NextResponse.json({ html })
  } catch (e) {
    if (e.code === 'not_configured' || e.code === 'empty') {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.error('format-dictation:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to format dictation' },
      { status: 502 }
    )
  }
}
