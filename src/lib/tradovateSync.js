import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { decryptBrokerSecret, encryptBrokerSecret } from '@/lib/brokerCrypto'
import { tradovateV1Base } from '@/lib/tradovateConstants'
import { renewTradovateAccessToken } from '@/lib/tradovateOAuth'

const APP_ID = 'TradeXEssence'
const APP_VERSION = '1.0'

export function tradovateBaseUrl(demo) {
  return tradovateV1Base(demo)
}

/**
 * @param {string} baseUrl - v1 API root (no trailing slash)
 * @param {{ name: string, password: string, cid: number, sec: string, deviceId: string }} creds
 */
export async function requestTradovateAccessToken(baseUrl, creds) {
  const base = baseUrl.replace(/\/$/, '')
  const body = {
    name: creds.name,
    password: creds.password,
    appId: APP_ID,
    appVersion: APP_VERSION,
    deviceId: creds.deviceId,
    cid: creds.cid,
    sec: creds.sec,
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
export async function ensureTradovateOAuthAccessToken(account) {
  if (!account.tradovateOAuthAccessEnc) return null
  let token = decryptBrokerSecret(account.tradovateOAuthAccessEnc)
  if (!token) throw new Error('Could not decrypt Tradovate OAuth token')

  const expiresAt = account.tradovateOAuthExpiresAt
  const demo = account.tradovateDemo !== false
  const needsRenew =
    !!expiresAt && new Date(expiresAt).getTime() - Date.now() < 90_000

  if (needsRenew) {
    const renewed = await renewTradovateAccessToken(demo, token)
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
    if (!account.tradovateName || !account.tradovatePasswordEnc || account.tradovateCid == null || !account.tradovateSecEnc) {
      throw new Error('Tradovate is not connected for this account')
    }

    const password = decryptBrokerSecret(account.tradovatePasswordEnc)
    const sec = decryptBrokerSecret(account.tradovateSecEnc)
    if (!password || !sec) throw new Error('Could not decrypt Tradovate credentials')

    newDeviceId = account.tradovateDeviceId || randomDeviceId()
    const tokenRes = await requestTradovateAccessToken(base, {
      name: account.tradovateName,
      password,
      cid: account.tradovateCid,
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
