import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CSV_TEMPLATE, suggestMapping } from '@/lib/csvProfiles'
import { readCsv } from '@/lib/csvImport'

const mock = vi.hoisted(() => ({ session: vi.fn(), gate: vi.fn(), account: vi.fn(), transaction: vi.fn(), find: vi.fn(), create: vi.fn(), lock: vi.fn() }))
vi.mock('next-auth', () => ({ getServerSession: mock.session }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/gateApi', () => ({ gateFeature: mock.gate, PlanError: class extends Error {}, planErrorResponse: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: { tradingAccount: { findFirst: mock.account }, $transaction: mock.transaction } }))
import { POST } from './route'

const csv = CSV_TEMPLATE + 'ES,Buy,2026-09-23 09:00,2026-09-23 10:00,5000,5001,1,45,5,0,0'
const payload = () => ({ csv, profile: 'topstepx', mapping: suggestMapping(readCsv(csv).headers, 'topstepx'), accountId: 'a1',
  options: { assetType: 'FUTURES', dateOrder: 'YMD', utcOffset: 'Z', pnlMode: 'net', decimal: 'dot', costMode: 'cost' } })
const request = (body = payload()) => new Request('http://localhost/api/trades/import', { method: 'POST', body: JSON.stringify(body) })
beforeEach(() => {
  vi.resetAllMocks()
  mock.session.mockResolvedValue({ user: { id: 'u1' } })
  mock.account.mockResolvedValue({ id: 'a1' })
  mock.transaction.mockImplementation(fn => fn({ $executeRaw: mock.lock, trade: { findMany: mock.find, createMany: mock.create } }))
  mock.find.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 't1' }])
})
describe('guided CSV API', () => {
  it('requires authentication', async () => { mock.session.mockResolvedValue(null); expect((await POST(request())).status).toBe(401); expect(mock.create).not.toHaveBeenCalled() })
  it('checks account ownership', async () => {
    mock.account.mockResolvedValue(null)
    expect((await POST(request())).status).toBe(404)
    expect(mock.account).toHaveBeenCalledWith({ where: { id: 'a1', userId: 'u1' }, select: { id: true } })
    expect(mock.transaction).not.toHaveBeenCalled()
  })
  it('validates again on the server and saves nothing for invalid rows', async () => {
    const body = payload(); body.csv = body.csv.replace(',Buy,', ',Deposit,')
    expect((await POST(request(body))).status).toBe(400)
    expect(mock.create).not.toHaveBeenCalled()
  })
  it('creates trades with server-owned user and account IDs', async () => {
    const result = await POST(request())
    expect(result.status).toBe(201)
    expect(await result.json()).toEqual({ created: 1, skipped: 0, ids: ['t1'] })
    expect(mock.create.mock.calls[0][0].data[0]).toMatchObject({ userId: 'u1', accountId: 'a1', netPnl: 45, grossPnl: 50, returnPercent: null })
    expect(mock.gate).toHaveBeenCalledWith('u1', 'csvImport', { upgradeTo: 'PRO' })
  })
  it('skips previously imported file rows', async () => {
    await POST(request())
    const ref = mock.create.mock.calls[0][0].data[0].externalRef
    mock.create.mockClear(); mock.find.mockReset().mockResolvedValue([{ externalRef: ref }])
    const result = await POST(request())
    expect(await result.json()).toEqual({ created: 0, skipped: 1, ids: [] })
    expect(mock.create).not.toHaveBeenCalled()
  })
  it('reports storage failure instead of claiming success', async () => {
    mock.transaction.mockRejectedValue(new Error('database unavailable'))
    const result = await POST(request())
    expect(result.status).toBe(500)
  })
})
