import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const playbooks = await prisma.playbook.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ playbooks })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, description, rules, color } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const playbook = await prisma.playbook.create({
    data: { userId: session.user.id, name, description: description || '', rules: JSON.stringify(rules || []), color: color || '#D4AF37' }
  })
  return NextResponse.json({ playbook }, { status: 201 })
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, name, description, rules, color } = await req.json()
  const playbook = await prisma.playbook.update({
    where: { id },
    data: { name, description, rules: JSON.stringify(rules || []), color }
  })
  return NextResponse.json({ playbook })
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await prisma.playbook.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
