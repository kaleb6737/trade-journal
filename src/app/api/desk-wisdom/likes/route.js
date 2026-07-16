import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isValidDeskWisdomQuoteId } from '@/lib/deskWisdomData'

/** Node only — avoids Prisma model delegates missing from some Next webpack server chunks. */
export const runtime = 'nodejs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await prisma.$queryRaw`
    SELECT "quoteId"
    FROM "DeskWisdomLike"
    WHERE "userId" = ${session.user.id}
    ORDER BY "createdAt" DESC
  `

  return NextResponse.json({ likedIds: rows.map((r) => r.quoteId) })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const quoteId = typeof body.quoteId === 'number' ? body.quoteId : parseInt(body.quoteId, 10)
  if (!isValidDeskWisdomQuoteId(quoteId)) {
    return NextResponse.json({ error: 'Invalid quoteId' }, { status: 400 })
  }

  const userId = session.user.id

  const found = await prisma.$queryRaw`
    SELECT "id" FROM "DeskWisdomLike"
    WHERE "userId" = ${userId} AND "quoteId" = ${quoteId}
    LIMIT 1
  `

  if (found.length > 0) {
    await prisma.$executeRaw`
      DELETE FROM "DeskWisdomLike" WHERE "id" = ${found[0].id}
    `
    return NextResponse.json({ liked: false, quoteId })
  }

  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO "DeskWisdomLike" ("id", "userId", "quoteId", "createdAt")
    VALUES (${id}, ${userId}, ${quoteId}, NOW())
  `
  return NextResponse.json({ liked: true, quoteId })
}
