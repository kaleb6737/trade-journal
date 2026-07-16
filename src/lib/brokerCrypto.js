import crypto from 'crypto'

const ALGO = 'aes-256-gcm'

function getKey() {
  const secret = process.env.BROKER_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'tradexessence-dev-key-change-me'
  return crypto.createHash('sha256').update(String(secret)).digest()
}

export function encryptBrokerSecret(plain) {
  if (!plain) return null
  const iv = crypto.randomBytes(16)
  const key = getKey()
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decryptBrokerSecret(b64) {
  if (!b64) return null
  const buf = Buffer.from(b64, 'base64')
  const iv = buf.subarray(0, 16)
  const tag = buf.subarray(16, 32)
  const enc = buf.subarray(32)
  const key = getKey()
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}
