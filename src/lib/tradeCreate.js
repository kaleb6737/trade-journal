import { deriveOccurredAt } from '@/lib/money'

/**
 * Build Prisma `data` for trade.create from API / CSV / bulk bodies.
 * @param {string} userId
 * @param {object} body
 * @returns {{ data: object } | { error: string }}
 */
export function buildTradeCreateData(userId, body) {
  const {
    symbol, side, assetType, status,
    entryDate, exitDate, entryPrice, exitPrice,
    quantity, commission, fees,
    stopLoss, takeProfit,
    tags, notes, mistakes, playbookId, accountId, externalRef,
    tradeSession, manualPnl,
  } = body

  if (!symbol || !side || !entryDate || entryPrice == null || quantity == null) {
    return { error: 'Missing required fields' }
  }

  const entry = new Date(entryDate)
  const exit = exitDate ? new Date(exitDate) : null

  let grossPnl = null
  let netPnl = null
  let returnPercent = null

  const ep = parseFloat(entryPrice)
  const qty = parseFloat(quantity)
  const comm =
    commission === undefined || commission === null || commission === ''
      ? 0
      : parseFloat(commission) || 0
  const fee =
    fees === undefined || fees === null || fees === '' ? 0 : parseFloat(fees) || 0

  if (manualPnl !== undefined && manualPnl !== null && `${manualPnl}`.trim() !== '') {
    netPnl = parseFloat(manualPnl)
    grossPnl = netPnl + comm + fee
    returnPercent = ep && qty ? (netPnl / (ep * qty)) * 100 : null
  } else if (exitPrice != null && exitPrice !== '' && status !== 'OPEN') {
    const direction = side === 'LONG' ? 1 : -1
    grossPnl = direction * (parseFloat(exitPrice) - ep) * qty
    netPnl = grossPnl - comm - fee
    returnPercent = ep && qty ? (netPnl / (ep * qty)) * 100 : null
  }

  const resolvedStatus = status || (exit ? 'CLOSED' : 'OPEN')
  const ref = typeof externalRef === 'string' && externalRef.trim() ? externalRef.trim() : null

  const data = {
    userId,
    symbol: symbol.toUpperCase().trim(),
    side,
    assetType: assetType || 'STOCK',
    status: resolvedStatus,
    entryDate: entry,
    exitDate: exit,
    occurredAt: deriveOccurredAt(exit || undefined, entry),
    entryPrice: ep,
    exitPrice: exitPrice != null && exitPrice !== '' ? parseFloat(exitPrice) : null,
    quantity: qty,
    commission: comm,
    fees: fee,
    stopLoss: stopLoss != null && stopLoss !== '' ? parseFloat(stopLoss) : null,
    takeProfit: takeProfit != null && takeProfit !== '' ? parseFloat(takeProfit) : null,
    grossPnl,
    netPnl,
    returnPercent,
    tags: JSON.stringify(tags || []),
    notes: notes || null,
    mistakes: JSON.stringify(mistakes || []),
    playbookId: playbookId || null,
    accountId: accountId || null,
    tradeSession: tradeSession || null,
    externalRef: ref,
  }

  return { data }
}
