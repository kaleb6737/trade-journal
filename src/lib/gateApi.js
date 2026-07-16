import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  PlanError,
  assertWithinLimit,
  getLimits,
  hasFeature,
  planFor,
  requireFeature,
} from '@/lib/plans'

/** Turn a PlanError into a 402 response with upgrade metadata. */
export function planErrorResponse(err) {
  return NextResponse.json(
    {
      error: err.message,
      code: err.code || 'plan_error',
      upgradeTo: err.upgradeTo || 'PRO',
    },
    { status: err.status || 402 },
  )
}

/** Load a lean user record for gating decisions. */
export async function loadGateUser(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, plan: true, email: true },
  })
}

/** Assert user has a feature. Throws PlanError (catch and pass to planErrorResponse). */
export async function gateFeature(userId, feature, opts) {
  const user = await loadGateUser(userId)
  requireFeature(user, feature, opts)
  return user
}

/** Assert user's current usage is under the cap for `counter` ('maxTrades' | 'maxAccounts'). */
export async function gateCount(userId, counter, opts = {}) {
  const user = await loadGateUser(userId)
  const limits = getLimits(user)
  const max = limits[counter]
  if (max == null) return user
  let current = 0
  if (counter === 'maxTrades') current = await prisma.trade.count({ where: { userId } })
  else if (counter === 'maxAccounts') current = await prisma.tradingAccount.count({ where: { userId } })
  assertWithinLimit(current, max, opts)
  return user
}

export { PlanError, hasFeature, planFor }
