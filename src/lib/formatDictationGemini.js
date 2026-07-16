/**
 * Server-only: turn raw speech-to-text into a compact HTML bullet list via Google Gemini.
 */

const MAX_INPUT = 12_000

const SYSTEM = `You convert rough speech-to-text from traders' voice notes into clean HTML only.

Rules:
- Output a single HTML unordered list: <ul><li>...</li></ul> with 2–12 list items unless the input is trivially one idea (then use exactly 1 item).
- Each <li> is one clear, concise sentence or short phrase (no nested lists, no sub-bullets).
- Fix obvious speech-recognition errors; keep the trader's meaning. Do not invent trades or numbers that were not implied.
- Do not add a title, preamble, markdown, or code fences — ONLY the <ul>...</ul> fragment.
- Use plain text inside each <li> (no HTML inside <li>).`

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function stripCodeFences(text) {
  let c = text.trim()
  if (c.startsWith('```')) {
    c = c.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/s, '').trim()
  }
  return c
}

/** Rebuild <ul> from model output so we only persist safe structure + plain text in <li>. */
export function sanitizeDictationHtml(html, rawFallback) {
  const stripped = stripCodeFences(html || '')
  const items = [...stripped.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
    .filter(Boolean)

  if (items.length === 0) {
    const t = String(rawFallback || '').trim().slice(0, 2000)
    if (!t) return null
    return `<ul><li>${escapeHtml(t)}</li></ul>`
  }

  return `<ul>${items.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`
}

export function isDictationAiConfigured() {
  return Boolean(getGeminiApiKey())
}

function getGeminiApiKey() {
  const v =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    ''
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * @param {string} rawText
 * @returns {Promise<string>} HTML fragment <ul>...</ul>
 */
export async function formatDictationWithGemini(rawText) {
  const key = getGeminiApiKey()
  if (!key) {
    const e = new Error('Gemini API key is not configured')
    e.code = 'not_configured'
    throw e
  }

  const input = String(rawText || '').trim().slice(0, MAX_INPUT)
  if (!input) {
    const e = new Error('Empty text')
    e.code = 'empty'
    throw e
  }

  const model = process.env.GEMINI_DICTATION_MODEL?.trim() || 'gemini-2.0-flash'
  const base = (process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com').replace(/\/$/, '')

  const url = `${base}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: input }],
        },
      ],
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 1200,
      },
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      data?.error?.message ||
      (typeof data?.error === 'string' ? data.error : null) ||
      res.statusText ||
      'Gemini request failed'
    const e = new Error(msg)
    e.code = 'gemini_error'
    e.status = res.status
    throw e
  }

  const parts = data?.candidates?.[0]?.content?.parts
  const text =
    Array.isArray(parts) && parts.length > 0
      ? parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('')
      : ''

  if (!text.trim()) {
    const block = data?.promptFeedback?.blockReason
    const finish = data?.candidates?.[0]?.finishReason
    const extra = block || (finish && finish !== 'STOP' && finish !== 'MAX_TOKENS' ? finish : '')
    const e = new Error(extra ? `Empty model response (${extra})` : 'Empty model response')
    e.code = 'empty_response'
    throw e
  }

  return sanitizeDictationHtml(text, input)
}
