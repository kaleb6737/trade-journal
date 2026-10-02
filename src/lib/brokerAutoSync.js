import { prisma } from '@/lib/prisma'
import { syncAlpacaAccount } from '@/lib/alpacaSync'
import { hasTradovatePasswordLogin, syncTradovateAccount } from '@/lib/tradovateSync'

export function accountEligibleForAutoSync(acc) {
  if (!acc.brokerAutoSyncEnabled) return false
  if (acc.broker === 'Alpaca' && acc.alpacaKeyId && acc.alpacaSecretEnc) return true
  if (acc.broker === 'Tradovate') {
    const oauth = !!acc.tradovateOAuthAccessEnc
    return oauth || hasTradovatePasswordLogin(acc)
  }
  return false
}

/**
 * Run the same import as manual "Sync fills". Updates lastBrokerSyncAt / lastBrokerSyncError.
 * @returns {Promise<object>}
 */
export async function runAutoSyncForAccount(userId, acc) {
  if (acc.broker === 'Alpaca' && acc.alpacaKeyId && acc.alpacaSecretEnc) {
    const result = await syncAlpacaAccount(userId, acc)
    await prisma.tradingAccount.update({
      where: { id: acc.id },
      data: { lastBrokerSyncAt: new Date(), lastBrokerSyncError: null },
    })
    return { ok: true, broker: 'alpaca', ...result }
  }

  const tvOAuth = !!acc.tradovateOAuthAccessEnc
  const tvLegacy = hasTradovatePasswordLogin(acc)
  if (acc.broker === 'Tradovate' && (tvOAuth || tvLegacy)) {
    const result = await syncTradovateAccount(userId, acc)
    await prisma.tradingAccount.update({
      where: { id: acc.id },
      data: { lastBrokerSyncAt: new Date(), lastBrokerSyncError: null },
    })
    return { ok: true, broker: 'tradovate', ...result }
  }

  return { ok: false, skipped: true, reason: 'not_connected' }
}
