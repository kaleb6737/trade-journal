import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { decryptBrokerSecret } from '@/lib/brokerCrypto'

const PAPER = 'https://paper-api.alpaca.markets'
const LIVE = 'https://api.alpaca.markets'

export function alpacaBaseUrl(paper) {
  return paper ? PAPER : LIVE
}

/**
 * Paginate Alpaca FILL activities (v2).
 */
export async function fetchAllFills(baseUrl, keyId, secretKey) {
  const all = []
  let pageToken = null
  const base = baseUrl.replace(/\/$/, '')
  for (let i = 0; i < 100; i++) {
    const url = new URL(`${base}/v2/account/activities`)
    url.searchParams.set('activity_types', 'FILL')
    url.searchParams.set('page_size', '100')
    if (pageToken) url.searchParams.set('page_token', pageToken)

    const res = await fetch(url.toString(), {
      headers: {
        'APCA-API-KEY-ID': keyId,
        'APCA-API-SECRET-KEY': secretKey,
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Alpaca ${res.status}: ${errText.slice(0, 500)}`)
    }

    const chunk = await res.json()
    if (!Array.isArray(chunk)) {
      throw new Error('Unexpected Alpaca activities response')
    }
    all.push(...chunk)

    if (chunk.length < 100) break

    pageToken =
      res.headers.get('next-page-token') ||
      res.headers.get('x-next-page-token') ||
      res.headers.get('Next-Page-Token')
    if (!pageToken) break
  }
  return all
}

export async function verifyAlpacaKeys(baseUrl, keyId, secretKey) {
  const base = baseUrl.replace(/\/$/, '')
  const res = await fetch(`${base}/v2/account`, {
    headers: {
      'APCA-API-KEY-ID': keyId,
      'APCA-API-SECRET-KEY': secretKey,
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Invalid Alpaca keys (${res.status}): ${t.slice(0, 300)}`)
  }
  return res.json()
}

function mapAssetClass(raw) {
  const a = String(raw || '').toLowerCase()
  if (a.includes('crypto')) return 'CRYPTO'
  if (a.includes('option')) return 'OPTIONS'
  if (a.includes('forex')) return 'FOREX'
  return 'STOCK'
}

function externalRefParts(parts) {
  const h = crypto.createHash('sha256').update(parts.map(String).join('|')).digest('hex').slice(0, 48)
  return `alpaca:${h}`
}

/**
 * FIFO long-only round-trips from chronological FILL activities.
 * Short sales and complex options legs may be skipped or partial.
 */
export function buildRoundTripTradesFromFills(fills) {
  const sorted = [...fills].sort(
    (a, b) => new Date(a.transaction_time).getTime() - new Date(b.transaction_time).getTime()
  )

  const lots = {}
  const out = []

  for (const f of sorted) {
    const sym = f.symbol
    if (!sym) continue
    const qty = Math.abs(parseFloat(f.qty || f.cum_qty || 0))
    if (!qty || Number.isNaN(qty)) continue

    const price = parseFloat(f.price)
    if (Number.isNaN(price)) continue

    const side = String(f.side || '').toLowerCase()
    const t = f.transaction_time
    const assetType = mapAssetClass(f.asset_class || f.asset_type)

    if (side === 'buy') {
      if (!lots[sym]) lots[sym] = []
      lots[sym].push({ qty, price, time: t, id: f.id })
      continue
    }

    if (side !== 'sell') continue

    let rem = qty
    const commissionTotal = parseFloat(f.commission) || 0

    while (rem > 1e-8 && lots[sym]?.length) {
      const lot = lots[sym][0]
      const take = Math.min(rem, lot.qty)
      const entryPrice = lot.price
      const exitPrice = price
      const entryTime = lot.time
      const exitTime = t
      const tradeQty = take

      const gross = (exitPrice - entryPrice) * tradeQty
      const commFrac = qty > 0 ? (commissionTotal * take) / qty : 0
      const net = gross - commFrac
      const denom = entryPrice * tradeQty
      const returnPercent = denom ? (net / denom) * 100 : 0

      const ref = externalRefParts([lot.id, f.id, String(take), entryTime, exitTime])

      out.push({
        symbol: sym.toUpperCase(),
        side: 'LONG',
        assetType,
        status: 'CLOSED',
        entryDate: new Date(entryTime),
        exitDate: new Date(exitTime),
        entryPrice,
        exitPrice,
        quantity: tradeQty,
        commission: commFrac,
        fees: 0,
        grossPnl: gross,
        netPnl: net,
        returnPercent,
        tags: ['Alpaca', 'sync'],
        notes: 'Imported via Alpaca FIFO fill sync.',
        externalRef: ref,
      })

      lot.qty -= take
      rem -= take
      if (lot.qty <= 1e-8) lots[sym].shift()
    }
  }

  return out
}

/**
 * Fetch fills, build FIFO trades, insert new rows (idempotent via externalRef).
 */
export async function syncAlpacaAccount(userId, account) {
  if (!account.alpacaKeyId || !account.alpacaSecretEnc) {
    throw new Error('Alpaca is not connected for this account')
  }
  const secret = decryptBrokerSecret(account.alpacaSecretEnc)
  if (!secret) throw new Error('Could not decrypt Alpaca secret')

  const base = alpacaBaseUrl(account.alpacaPaper)
  const fills = await fetchAllFills(base, account.alpacaKeyId, secret)
  const built = buildRoundTripTradesFromFills(fills)

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

  return {
    created,
    skipped,
    fillCount: fills.length,
    candidates: built.length,
  }
}
