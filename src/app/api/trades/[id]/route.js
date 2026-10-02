import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deriveOccurredAt, toMoneyNumber } from '@/lib/money'
import { ASSET_TYPES } from '@/lib/utils'
import { normalizeR } from '@/lib/rMultiple'

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const trade = await prisma.trade.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ trade })
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const existing = await prisma.trade.findFirst({
      where: { id: params.id, userId: session.user.id },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const {
      symbol, side, assetType, status,
      entryDate, exitDate, entryPrice, exitPrice,
      quantity, commission, fees,
      stopLoss, takeProfit,
      tags, notes, mistakes, playbookId, accountId,
      tradeSession,
      manualPnl,
      hidden,
      emotionScore, emotionTags,
      rMultiple,
    } = body

    const onlyHidden =
      hidden !== undefined &&
      [
        symbol, side, assetType, status, entryDate, exitDate, entryPrice, exitPrice,
        quantity, commission, fees, stopLoss, takeProfit, tags, notes, mistakes,
        playbookId, accountId, tradeSession, manualPnl, rMultiple,
      ].every((v) => v === undefined)

    if (onlyHidden) {
      const updated = await prisma.trade.update({
        where: { id: params.id },
        data: { hidden: Boolean(hidden) },
      })
      return NextResponse.json({ trade: updated })
    }

    const nextEntry =
      entryDate !== undefined ? new Date(entryDate) : existing.entryDate
    const nextExit =
      exitDate !== undefined ? (exitDate ? new Date(exitDate) : null) : existing.exitDate

    // Only recompute P&L when something that affects it was sent. Otherwise an
    // unrelated update (e.g. the emotion check-in) would overwrite a manual P&L with
    // a price-based one that doesn't know the contract's point value.
    const pnlInputsChanged = [entryPrice, exitPrice, quantity, commission, fees, side, status, manualPnl]
      .some((v) => v !== undefined)

    let grossPnl = pnlInputsChanged ? null : undefined
    let netPnl = pnlInputsChanged ? null : undefined
    let returnPercent = pnlInputsChanged ? null : undefined

    const ep = entryPrice != null ? parseFloat(entryPrice) : (toMoneyNumber(existing.entryPrice) ?? 0)
    const qty = quantity != null ? parseFloat(quantity) : (toMoneyNumber(existing.quantity) ?? 0)
    const comm = commission != null ? parseFloat(commission) : (toMoneyNumber(existing.commission) ?? 0)
    const fee = fees != null ? parseFloat(fees) : (toMoneyNumber(existing.fees) ?? 0)

    // Determine the effective status
    const currentStatus = status || existing.status

    if (!pnlInputsChanged) {
      // leave stored P&L untouched
    } else if (manualPnl !== undefined && manualPnl !== null && manualPnl !== '') {
      // Explicit manual P&L override
      netPnl = parseFloat(manualPnl)
      grossPnl = netPnl + comm + fee
      returnPercent = ep && qty ? (netPnl / (ep * qty)) * 100 : null
    } else if (manualPnl === null || (exitPrice !== undefined ? exitPrice != null : existing.exitPrice != null)) {
       // Either manual P&L was cleared, or we have an exit price and no manual P&L override
       const xp = exitPrice !== undefined ? (exitPrice != null ? parseFloat(exitPrice) : null) : (existing.exitPrice != null ? parseFloat(existing.exitPrice) : null)
       
       if (xp != null && currentStatus === 'CLOSED') {
         const direction = (side || existing.side || 'LONG') === 'LONG' ? 1 : -1
         grossPnl = direction * (xp - ep) * qty
         netPnl = grossPnl - comm - fee
         returnPercent = ep && qty ? (netPnl / (ep * qty)) * 100 : null
       } else if (manualPnl === null) {
         // manualPnl was explicitly cleared, and we couldn't auto-calculate (no exit price or open)
         grossPnl = null
         netPnl = null
         returnPercent = null
       }
    }

    const updated = await prisma.trade.update({
      where: { id: params.id },
      data: {
        ...(symbol && { symbol: symbol.toUpperCase().trim() }),
        ...(side && { side }),
        ...(assetType != null &&
          assetType !== '' &&
          ASSET_TYPES.includes(String(assetType).toUpperCase()) && {
            assetType: String(assetType).toUpperCase(),
          }),
        ...(status && { status }),
        ...(entryDate !== undefined && { entryDate: nextEntry }),
        ...(exitDate !== undefined && { exitDate: nextExit }),
        occurredAt: deriveOccurredAt(nextExit || undefined, nextEntry),
        ...(entryPrice != null && { entryPrice: parseFloat(entryPrice) }),
        ...(exitPrice != null && { exitPrice: parseFloat(exitPrice) }),
        ...(quantity != null && { quantity: parseFloat(quantity) }),
        ...(commission != null && { commission: parseFloat(commission) }),
        ...(fees != null && { fees: parseFloat(fees) }),
        ...(stopLoss !== undefined && { stopLoss: stopLoss === '' || stopLoss == null ? null : parseFloat(stopLoss) }),
        ...(takeProfit !== undefined && { takeProfit: takeProfit === '' || takeProfit == null ? null : parseFloat(takeProfit) }),
        ...(grossPnl !== undefined && { grossPnl, netPnl, returnPercent }),
        ...(tags != null && { tags: JSON.stringify(tags) }),
        ...(notes !== undefined && { notes }),
        ...(mistakes != null && { mistakes: JSON.stringify(mistakes) }),
        ...(playbookId !== undefined && { playbookId }),
        ...(accountId !== undefined && { accountId }),
        ...(tradeSession !== undefined && {
          tradeSession: tradeSession === '' || tradeSession == null ? null : String(tradeSession),
        }),
        ...(hidden !== undefined && { hidden: Boolean(hidden) }),
        ...(emotionScore !== undefined && { emotionScore: emotionScore === null ? null : Number(emotionScore) }),
        ...(emotionTags  !== undefined && { emotionTags: JSON.stringify(emotionTags) }),
        ...(rMultiple !== undefined && { rMultiple: normalizeR(rMultiple, netPnl !== undefined ? netPnl : existing.netPnl) }),
      },
    })

    return NextResponse.json({ trade: updated })
  } catch (error) {
    console.error('Update trade error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const del = await prisma.trade.deleteMany({ where: { id: params.id, userId: session.user.id } })
  if (!del.count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
