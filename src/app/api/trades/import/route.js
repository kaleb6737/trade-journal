import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { gateFeature, PlanError, planErrorResponse } from '@/lib/gateApi'
import { CSV_MAX_BYTES, prepareCsv } from '@/lib/csvImport'
import { buildTradeCreateData } from '@/lib/tradeCreate'

export const runtime = 'nodejs'

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Read a bounded body, including requests without Content-Length.
  const reader = req.body?.getReader()
  if (!reader) return NextResponse.json({ error: 'Missing request body' }, { status: 400 })
  const chunks = []; let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > CSV_MAX_BYTES * 2 + 32768) {
      await reader.cancel()
      return NextResponse.json({ error: 'Upload too large' }, { status: 413 })
    }
    chunks.push(Buffer.from(value))
  }
  let body
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body || typeof body.accountId !== 'string') return NextResponse.json({ error: 'Choose a destination account' }, { status: 400 })

  try {
    await gateFeature(session.user.id, 'csvImport', { upgradeTo: 'PRO' })
    const account = await prisma.tradingAccount.findFirst({ where: { id: body.accountId, userId: session.user.id }, select: { id: true } })
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    let preview
    try { preview = prepareCsv(body.csv, body.profile, body.mapping, body.options) }
    catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }) }
    if (preview.errors.length || !preview.trades.length) return NextResponse.json({ error: 'Correct all CSV rows before importing.', rows: preview.errors.slice(0, 20) }, { status: 400 })

    const digest = createHash('sha256').update(body.csv.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim()).digest('hex')
    const built = preview.trades.map(t => {
      const externalRef = `csv:${body.profile}:${account.id}:${digest}:${t.sourceRow}`
      const row = buildTradeCreateData(session.user.id, { ...t, accountId: account.id, externalRef })
      if (row.error) throw new Error(row.error)
      // Source units can be lots/contracts; price * quantity is not their capital basis.
      row.data.returnPercent = null
      return row.data
    })
    const refs = built.map(t => t.externalRef)
    const result = await prisma.$transaction(async tx => {
      // Serialize concurrent imports for this user so retry counts and returned IDs stay accurate.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${session.user.id}))`
      const existing = await tx.trade.findMany({ where: { userId: session.user.id, externalRef: { in: refs } }, select: { externalRef: true } })
      const known = new Set(existing.map(t => t.externalRef))
      const fresh = built.filter(t => !known.has(t.externalRef))
      if (!fresh.length) return { created: 0, skipped: built.length, ids: [] }
      await tx.trade.createMany({ data: fresh })
      const saved = await tx.trade.findMany({ where: { userId: session.user.id, externalRef: { in: fresh.map(t => t.externalRef) } }, select: { id: true } })
      return { created: saved.length, skipped: built.length - saved.length, ids: saved.map(t => t.id) }
    }, { timeout: 20000 })
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    if (e instanceof PlanError) return planErrorResponse(e)
    console.error('[csv-import]', e.code || e.name)
    return NextResponse.json({ error: 'Import could not be completed. Retry the same file safely.' }, { status: 500 })
  }
}
