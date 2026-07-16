import crypto from 'crypto'
import { tradovateApiOrigin, tradovateV1Base } from '@/lib/tradovateConstants'

export const TRADOVATE_OAUTH_AUTHORIZE = 'https://trader.tradovate.com/oauth'

export function isTradovateOAuthConfigured() {
  return !!(
    process.env.TRADOVATE_OAUTH_CLIENT_ID?.trim() && process.env.TRADOVATE_OAUTH_CLIENT_SECRET?.trim()
  )
}

function stateSecret() {
  return process.env.NEXTAUTH_SECRET || process.env.TRADOVATE_OAUTH_STATE_SECRET || ''
}

export function buildTradovateOAuthState({ userId, accountId, demo }) {
  const payload = Buffer.from(
    JSON.stringify({ u: userId, a: accountId, d: !!demo, t: Date.now() }),
    'utf8'
  ).toString('base64url')
  const sig = crypto.createHmac('sha256', stateSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyTradovateOAuthState(state) {
  if (!state || typeof state !== 'string') return null
  const i = state.lastIndexOf('.')
  if (i === -1) return null
  const payload = state.slice(0, i)
  const sig = state.slice(i + 1)
  const expected = crypto.createHmac('sha256', stateSecret()).update(payload).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (Date.now() - data.t > 20 * 60 * 1000) return null
    if (!data.u || !data.a) return null
    return { userId: data.u, accountId: data.a, demo: !!data.d }
  } catch {
    return null
  }
}

/** Absolute callback URL — must match Tradovate OAuth app settings exactly. */
export function getTradovateOAuthRedirectUri(req) {
  const explicit = process.env.TRADOVATE_OAUTH_REDIRECT_URI?.trim()
  if (explicit) return explicit
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, '')
  if (base) return `${base}/api/brokers/tradovate/oauth/callback`
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  if (!host) throw new Error('Cannot infer OAuth redirect host (set NEXTAUTH_URL or TRADOVATE_OAUTH_REDIRECT_URI)')
  return `${proto}://${host}/api/brokers/tradovate/oauth/callback`
}

/**
 * Exchange authorization code for access token (Tradovate OAuth).
 * Uses Basic auth + form body (per Tradovate / community examples).
 */
export async function exchangeTradovateOAuthCode({ demo, code, redirectUri }) {
  const clientId = process.env.TRADOVATE_OAUTH_CLIENT_ID
  const clientSecret = process.env.TRADOVATE_OAUTH_CLIENT_SECRET
  const origin = tradovateApiOrigin(demo)
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
  })

  let res = await fetch(`${origin}/auth/oauthtoken`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body: body.toString(),
    cache: 'no-store',
  })

  let json = await res.json().catch(() => ({}))

  if (!res.ok || json.error) {
    const body2 = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    })
    res = await fetch(`${origin}/auth/oauthtoken`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body2.toString(),
      cache: 'no-store',
    })
    json = await res.json().catch(() => ({}))
  }

  if (!res.ok) {
    const msg = json.error_description || json.errorText || json.message || json.error || `HTTP ${res.status}`
    throw new Error(typeof msg === 'string' ? msg.slice(0, 400) : 'Token exchange failed')
  }

  const accessToken = json.accessToken || json.access_token
  if (!accessToken) throw new Error('Tradovate OAuth did not return an access token')

  const expiresIn = Number(json.expiresIn ?? json.expires_in ?? 3600) || 3600
  return { accessToken, expiresIn }
}

/**
 * Extend session before access token expires (Tradovate has no refresh_token grant).
 */
export async function renewTradovateAccessToken(demo, accessToken) {
  const origin = tradovateApiOrigin(demo)
  const paths = [`${origin}/auth/renewAccessToken`, `${tradovateV1Base(demo)}/auth/renewAccessToken`]

  let lastErr = 'Renew failed'
  for (const url of paths) {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      const next = json.accessToken || json.access_token || accessToken
      const expiresIn = Number(json.expiresIn ?? json.expires_in ?? 3600) || 3600
      return { accessToken: next, expiresIn }
    }
    lastErr = json.errorText || json.message || `HTTP ${res.status}`
  }
  throw new Error(typeof lastErr === 'string' ? lastErr.slice(0, 400) : 'Token renew failed')
}

export async function fetchTradovateOAuthProfile(demo, accessToken) {
  const base = tradovateV1Base(demo)
  const paths = ['/auth/me', '/user/get']
  for (const path of paths) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      })
      const json = await res.json().catch(() => null)
      if (res.ok && json && typeof json === 'object') return json
    } catch {
      /* try next */
    }
  }
  return null
}
