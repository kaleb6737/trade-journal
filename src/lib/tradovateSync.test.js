import { vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: { tradingAccount: { update: vi.fn() } } }))
vi.mock('@/lib/tradovateOAuth', () => ({ renewTradovateAccessToken: vi.fn() }))

const { encryptBrokerSecret } = await import('@/lib/brokerCrypto')
const { renewTradovateAccessToken } = await import('@/lib/tradovateOAuth')
const { ensureTradovateOAuthAccessToken, TRADOVATE_SIGNIN_EXPIRED, hasTradovatePasswordLogin, tradovateAppCredentials } = await import('@/lib/tradovateSync')

const acct = (overrides) => ({
  id: 'a1', tradovateDemo: true, tradovateOAuthAccessEnc: encryptBrokerSecret('tok'), ...overrides,
})
const apiKeyLogin = { tradovateName: 'trader', tradovatePasswordEnc: 'x', tradovateCid: 1, tradovateSecEnc: 'y' }

describe('ensureTradovateOAuthAccessToken', () => {
  it('uses a still-valid sign-in as is', async () => {
    const t = await ensureTradovateOAuthAccessToken(acct({ tradovateOAuthExpiresAt: new Date(Date.now() + 3600_000) }))
    expect(t).toBe('tok')
  })

  it('asks the trader to sign in again once the sign-in has expired (daily sync case)', async () => {
    await expect(ensureTradovateOAuthAccessToken(acct({ tradovateOAuthExpiresAt: new Date(Date.now() - 1000) })))
      .rejects.toThrow(TRADOVATE_SIGNIN_EXPIRED)
  })

  it('falls back to API-key login when the sign-in expired but API keys are saved', async () => {
    const t = await ensureTradovateOAuthAccessToken(acct({ tradovateOAuthExpiresAt: new Date(Date.now() - 1000), ...apiKeyLogin }))
    expect(t).toBeNull()
  })

  it('treats a failed renewal like an expired sign-in', async () => {
    renewTradovateAccessToken.mockRejectedValueOnce(new Error('HTTP 401'))
    await expect(ensureTradovateOAuthAccessToken(acct({ tradovateOAuthExpiresAt: new Date(Date.now() + 30_000) })))
      .rejects.toThrow(TRADOVATE_SIGNIN_EXPIRED)
  })
})

describe('username + password login with the app\'s own API keys', () => {
  const saved = { cid: process.env.TRADOVATE_APP_CID, sec: process.env.TRADOVATE_APP_SEC }
  afterEach(() => { process.env.TRADOVATE_APP_CID = saved.cid ?? ''; process.env.TRADOVATE_APP_SEC = saved.sec ?? '' })

  it('needs the trader\'s own cid/sec when the app has none', () => {
    process.env.TRADOVATE_APP_CID = ''; process.env.TRADOVATE_APP_SEC = ''
    expect(tradovateAppCredentials()).toBeNull()
    expect(hasTradovatePasswordLogin({ tradovateName: 'u', tradovatePasswordEnc: 'p' })).toBe(false)
    expect(hasTradovatePasswordLogin({ tradovateName: 'u', tradovatePasswordEnc: 'p', tradovateCid: 8, tradovateSecEnc: 's' })).toBe(true)
  })

  it('works with just username + password once the app keys are set', () => {
    process.env.TRADOVATE_APP_CID = '1234'; process.env.TRADOVATE_APP_SEC = 'app-secret'
    expect(tradovateAppCredentials()).toEqual({ cid: 1234, sec: 'app-secret' })
    expect(hasTradovatePasswordLogin({ tradovateName: 'u', tradovatePasswordEnc: 'p' })).toBe(true)
    expect(hasTradovatePasswordLogin({ tradovateName: 'u' })).toBe(false)
  })
})
