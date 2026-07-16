/** Shared guard for cron-style routes (weekly roundup, broker auto-sync, …). */
export function isCronAuthorized(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const headerSecret = req.headers.get('x-cron-secret')
  const bearer = req.headers.get('authorization')
  if (headerSecret && headerSecret === secret) return true
  if (bearer?.startsWith('Bearer ') && bearer.slice(7) === secret) return true
  return false
}
