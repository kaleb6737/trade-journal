import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { decryptBrokerSecret, encryptBrokerSecret } from '@/lib/brokerCrypto'
import { tradovateV1Base } from '@/lib/tradovateConstants'
import { renewTradovateAccessToken } from '@/lib/tradovateOAuth'

// Tradovate API keys are issued for a specific appId/appVersion; login fails if these
// don't match the key. Set them from the key Tradovate gives you.
const appId = () => process.env.TRADOVATE_APP_ID?.trim() || 'TradeXEssence'
const appVersion = () => process.env.TRADOVATE_APP_VERSION?.trim() || '1.0'

export function tradovateBaseUrl(demo) {
  return tradovateV1Base(demo)
}

/**
 * The app's own Tradovate API credentials (like TradeZella's). With these set,
 * traders connect with just their Tradovate username + password.
 */
export function tradovateAppCredentials() {
  const cid = parseInt(process.env.TRADOVATE_APP_CID || '', 10)
  const sec = process.env.TRADOVATE_APP_SEC?.trim()
  return Number.isFinite(cid) && sec ? { cid, sec } : null
}

/** Username/password login is possible: saved password + (own API keys or the app's). */
export function hasTradovatePasswordLogin(account) {
  if (!account?.tradovateName || !account?.tradovatePasswordEnc) return false
  return (account.tradovateCid != null && !!account.tradovateSecEnc) || !!tradovateAppCredentials()
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

/**
 * @param {string} baseUrl - v1 API root (no trailing slash)
 * @param {{ name: string, password: string, cid: number, sec: string, deviceId: string }} creds
 */
export async function requestTradovateAccessToken(baseUrl, creds) {
  const base = baseUrl.replace(/\/$/, '')
  const body = {
    name: creds.name,
    password: creds.password,
    appId: appId(),
    appVersion: appVersion(),
    deviceId: creds.deviceId,
    cid: creds.cid,
    sec: creds.sec,
    ...(creds['p-ticket'] ? { 'p-ticket': creds['p-ticket'] } : {}),
  }

  const res = await fetch(`${base}/auth/accesstokenrequest`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = json.errorText || json.message || `HTTP ${res.status}`
    throw new Error(typeof msg === 'string' ? msg.slice(0, 400) : 'Tradovate auth failed')
  }
  // Tradovate throttles repeated logins with a "penalty ticket": wait p-time seconds
  // and retry with the ticket, or (with p-captcha) require a browser login first.
  if (json['p-ticket']) {
    if (json['p-captcha']) {
      throw new Error('Tradovate wants a security check. Log in once at trader.tradovate.com in your browser, then try connecting again.')
    }
    const wait = Number(json['p-time']) || 0
    if ((creds._attempt || 0) >= 2 || wait > 20) {
      throw new Error(`Tradovate is limiting login attempts. Try again in ${Math.max(wait, 30)} seconds.`)
    }
    await sleep(wait * 1000)
    return requestTradovateAccessToken(baseUrl, { ...creds, 'p-ticket': json['p-ticket'], _attempt: (creds._attempt || 0) + 1 })
  }
  if (json.errorText && String(json.errorText).trim()) {
    throw new Error(String(json.errorText).slice(0, 400))
  }
  if (!json.accessToken) {
    throw new Error('Tradovate did not return an access token')
  }
  return json
}

export async function verifyTradovateCredentials(baseUrl, creds) {
  return requestTradovateAccessToken(baseUrl, creds)
}

async function tvFetchJson(baseUrl, accessToken, path, init = {}) {
  const base = baseUrl.replace(/\/$/, '')
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
    cache: 'no-store',
  })
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`Tradovate ${path}: invalid JSON (${res.status})`)
  }
  if (!res.ok) {
    const msg = json?.errorText || json?.message || text || `HTTP ${res.status}`
    throw new Error(`Tradovate ${path}: ${String(msg).slice(0, 400)}`)
  }
  return json
}

/**
 * @returns {Promise<Array>}
 */
export async function fetchFillList(baseUrl, accessToken) {
  const data = await tvFetchJson(baseUrl, accessToken, '/fill/list', { method: 'GET' })
  if (!Array.isArray(data)) {
    throw new Error('Unexpected Tradovate fill/list response')
  }
  return data
}

/**
 * @param {number[]} ids
 */
export async function fetchContractItems(baseUrl, accessToken, ids) {
  if (!ids.length) return {}
  const out = {}
  const chunkSize = 80
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    const q = chunk.map((id) => encodeURIComponent(String(id))).join(',')
    const data = await tvFetchJson(baseUrl, accessToken, `/contract/items?ids=${q}`, { method: 'GET' })
    if (!Array.isArray(data)) continue
    for (const c of data) {
      if (c && c.id != null) {
        out[c.id] = c.symbol || c.name || String(c.id)
      }
    }
  }
  return out
}

function externalRefParts(parts) {
  const h = crypto.createHash('sha256').update(parts.map(String).join('|')).digest('hex').slice(0, 48)
  return `tradovate:${h}`
}

/**
 * FIFO long-only round-trips from chronological fills (keyed by contractId).
 */
export function buildRoundTripTradesFromTradovateFills(fills, contractIdToSymbol) {
  const sorted = [...fills].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const lots = {}
  const out = []

  for (const f of sorted) {
    const contractId = f.contractId
    if (contractId == null) continue
    const key = String(contractId)

    const qty = Math.abs(parseFloat(f.qty || 0))
    if (!qty || Number.isNaN(qty)) continue

    const price = parseFloat(f.price)
    if (Number.isNaN(price)) continue

    const sym = (contractIdToSymbol[contractId] || key).toString().toUpperCase()
    const action = String(f.action || '').toLowerCase()
    const t = f.timestamp

    if (action === 'buy') {
      if (!lots[key]) lots[key] = []
      lots[key].push({ qty, price, time: t, id: f.id })
      continue
    }

    if (action !== 'sell') continue

    let rem = qty

    while (rem > 1e-8 && lots[key]?.length) {
      const lot = lots[key][0]
      const take = Math.min(rem, lot.qty)
      const entryPrice = lot.price
      const exitPrice = price
      const entryTime = lot.time
      const exitTime = t
      const tradeQty = take

      const gross = (exitPrice - entryPrice) * tradeQty
      const net = gross
      const denom = entryPrice * tradeQty
      const returnPercent = denom ? (net / denom) * 100 : 0

      const ref = externalRefParts([lot.id, f.id, String(take), entryTime, exitTime, key])

      out.push({
        symbol: sym,
        side: 'LONG',
        assetType: 'FUTURES',
        status: 'CLOSED',
        entryDate: new Date(entryTime),
        exitDate: new Date(exitTime),
        entryPrice,
        exitPrice,
        quantity: tradeQty,
        commission: 0,
        fees: 0,
        grossPnl: gross,
        netPnl: net,
        returnPercent,
        tags: ['Tradovate', 'sync'],
        notes: 'Imported via Tradovate FIFO fill sync.',
        externalRef: ref,
      })

      lot.qty -= take
      rem -= take
      if (lot.qty <= 1e-8) lots[key].shift()
    }
  }

  return out
}

export function randomDeviceId() {
  try {
    return crypto.randomUUID()
  } catch {
    return `txe-${crypto.randomBytes(16).toString('hex')}`
  }
}

/**
 * Valid OAuth access token, renewing shortly before expiry when needed.
 * @param {import('@prisma/client').TradingAccount} account
 */
export const TRADOVATE_SIGNIN_EXPIRED = 'Tradovate sign-in expired — sign in with Tradovate again on the Accounts page to reconnect and sync.'

export async function ensureTradovateOAuthAccessToken(account) {
  if (!account.tradovateOAuthAccessEnc) return null
  let token = decryptBrokerSecret(account.tradovateOAuthAccessEnc)
  if (!token) throw new Error('Could not decrypt Tradovate OAuth token')

  const expiresAt = account.tradovateOAuthExpiresAt
  const demo = account.tradovateDemo !== false
  const msLeft = expiresAt ? new Date(expiresAt).getTime() - Date.now() : Infinity
  const hasApiKeyLogin = hasTradovatePasswordLogin(account)

  // Tradovate can only renew a token that hasn't expired yet (~80 min life), so a
  // once-a-day sync usually finds it expired. Fall back to API-key login if the
  // account has one; otherwise the trader has to sign in again.
  if (msLeft <= 0) {
    if (hasApiKeyLogin) return null
    throw new Error(TRADOVATE_SIGNIN_EXPIRED)
  }

  if (msLeft < 90_000) {
    let renewed
    try {
      renewed = await renewTradovateAccessToken(demo, token)
    } catch {
      if (hasApiKeyLogin) return null
      throw new Error(TRADOVATE_SIGNIN_EXPIRED)
    }
    token = renewed.accessToken
    const ms = (renewed.expiresIn || 3600) * 1000
    const nextExp = new Date(Date.now() + ms)
    await prisma.tradingAccount.update({
      where: { id: account.id },
      data: {
        tradovateOAuthAccessEnc: encryptBrokerSecret(token),
        tradovateOAuthExpiresAt: nextExp,
      },
    })
  }

  return token
}

/**
 * @param {import('@prisma/client').TradingAccount} account
 */
export async function syncTradovateAccount(userId, account) {
  const base = tradovateBaseUrl(account.tradovateDemo !== false)

  let accessToken = await ensureTradovateOAuthAccessToken(account)
  let newDeviceId = null

  if (!accessToken) {
    if (!hasTradovatePasswordLogin(account)) {
      throw new Error('Tradovate is not connected for this account')
    }

    const own = account.tradovateCid != null && account.tradovateSecEnc
    const app = tradovateAppCredentials()
    const password = decryptBrokerSecret(account.tradovatePasswordEnc)
    const sec = own ? decryptBrokerSecret(account.tradovateSecEnc) : app.sec
    const cid = own ? account.tradovateCid : app.cid
    if (!password || !sec) throw new Error('Could not decrypt Tradovate credentials')

    newDeviceId = account.tradovateDeviceId || randomDeviceId()
    const tokenRes = await requestTradovateAccessToken(base, {
      name: account.tradovateName,
      password,
      cid,
      sec,
      deviceId: newDeviceId,
    })

    accessToken = tokenRes.accessToken
  }

  const fills = await fetchFillList(base, accessToken)

  const contractIds = [...new Set(fills.map((f) => f.contractId).filter((id) => id != null))]
  const contractIdToSymbol = await fetchContractItems(base, accessToken, contractIds)

  const built = buildRoundTripTradesFromTradovateFills(fills, contractIdToSymbol)

  let created = 0
  let skipped = 0

  for (const b of built) {
    const exists = await prisma.trade.findFirst({
      where: { userId, externalRef: b.externalRef },
    })
    if (exists) {
      skipped++
      continue
    }

    await prisma.trade.create({
      data: {
        userId,
        accountId: account.id,
        symbol: b.symbol,
        side: b.side,
        assetType: b.assetType,
        status: b.status,
        entryDate: b.entryDate,
        exitDate: b.exitDate,
        occurredAt: b.exitDate || b.entryDate,
        entryPrice: b.entryPrice,
        exitPrice: b.exitPrice,
        quantity: b.quantity,
        commission: b.commission,
        fees: b.fees,
        grossPnl: b.grossPnl,
        netPnl: b.netPnl,
        returnPercent: b.returnPercent,
        tags: JSON.stringify(b.tags || []),
        notes: b.notes,
        mistakes: JSON.stringify([]),
        externalRef: b.externalRef,
      },
    })
    created++
  }

  if (newDeviceId && !account.tradovateDeviceId) {
    await prisma.tradingAccount.update({
      where: { id: account.id },
      data: { tradovateDeviceId: newDeviceId },
    })
  }

  return {
    created,
    skipped,
    fillCount: fills.length,
    candidates: built.length,
  }
}
