process.env.TZ = 'America/New_York'

import { buildWeeks, localDayKey, periodLabel, periodOf } from './journalWeeks'

const at = (s) => +new Date(s) // local time (no Z) in America/New_York
const iso = (ms) => new Date(ms).toString().slice(0, 24)

describe('periodOf — default Monday weeks', () => {
  it('puts a Wednesday in the Monday–Sunday week', () => {
    const p = periodOf(at('2026-09-23T10:00:00'))
    expect(iso(p.start)).toBe('Mon Sep 21 2026 00:00:00')
    expect(iso(p.end)).toBe('Mon Sep 28 2026 00:00:00')
  })

  it('keeps Sunday night in the week that started the previous Monday', () => {
    expect(iso(periodOf(at('2026-09-27T23:59:00')).start)).toBe('Mon Sep 21 2026 00:00:00')
  })

  it('ends on local midnight across the daylight-saving change', () => {
    const p = periodOf(at('2026-10-30T12:00:00'))
    expect(iso(p.start)).toBe('Mon Oct 26 2026 00:00:00')
    expect(iso(p.end)).toBe('Mon Nov 02 2026 00:00:00')
  })
})

describe('periodOf — manual "start new week"', () => {
  const anchor = at('2026-09-27T18:00:00') // Sunday 6pm futures open

  it('cuts the running week short at the manual start', () => {
    const p = periodOf(at('2026-09-27T17:00:00'), [anchor])
    expect(iso(p.start)).toBe('Mon Sep 21 2026 00:00:00')
    expect(p.end).toBe(anchor)
  })

  it('a trade exactly at the start belongs to the new week', () => {
    expect(periodOf(anchor, [anchor]).start).toBe(anchor)
  })

  it('repeats every 7 days from the manual start', () => {
    const p1 = periodOf(at('2026-09-30T10:00:00'), [anchor])
    expect(p1).toEqual({ start: anchor, end: anchor + 7 * 86400000 })
    const p2 = periodOf(at('2026-10-05T10:00:00'), [anchor])
    expect(p2.start).toBe(anchor + 7 * 86400000)
  })

  it('a later manual start cuts the earlier cycle short', () => {
    const second = at('2026-10-01T09:30:00')
    const before = periodOf(at('2026-09-30T10:00:00'), [anchor, second])
    expect(before).toEqual({ start: anchor, end: second })
    expect(periodOf(at('2026-10-02T10:00:00'), [anchor, second]).start).toBe(second)
  })
})

describe('buildWeeks', () => {
  it('groups trades, excludes hidden trades from P&L, and always lists the current week', () => {
    const rows = [
      { entryDate: '2026-09-21T15:00:00Z', netPnl: '-98', hidden: false },
      { entryDate: '2026-09-22T18:00:00Z', netPnl: '-931', hidden: false },
      { entryDate: '2026-09-23T18:00:00Z', netPnl: '500', hidden: true },
      { entryDate: '2026-09-15T15:00:00Z', netPnl: '200', hidden: false },
    ]
    const weeks = buildWeeks(rows, [])
    const sep21 = weeks.find((w) => iso(w.start) === 'Mon Sep 21 2026 00:00:00')
    expect(sep21).toMatchObject({ trades: 3, net: -1029 })
    expect(weeks.find((w) => iso(w.start) === 'Mon Sep 14 2026 00:00:00')).toMatchObject({ trades: 1, net: 200 })
    expect(weeks.some((w) => w.start <= Date.now() && Date.now() < w.end)).toBe(true)
    expect(weeks.map((w) => w.start)).toEqual([...weeks.map((w) => w.start)].sort((a, b) => b - a))
  })
})

describe('buildWeeks after starting a new week', () => {
  it('still lists the week that just ended even if it had no trades', () => {
    const justNow = Date.now() - 60_000
    const weeks = buildWeeks([], [justNow])
    expect(weeks).toHaveLength(2)
    expect(weeks[0].start).toBe(justNow) // the new week
    expect(weeks[1].end).toBe(justNow)   // the week it cut short
  })
})

describe('labels', () => {
  it('formats a normal week and a manually started one', () => {
    expect(periodLabel(periodOf(at('2026-09-23T10:00:00')))).toBe('Sep 21 – 27')
    const anchor = at('2026-09-27T18:00:00')
    expect(periodLabel({ start: anchor, end: anchor + 7 * 86400000 })).toBe('Sep 27 6:00 PM – Oct 4 6:00 PM')
  })

  it('localDayKey uses the local calendar day', () => {
    expect(localDayKey(at('2026-09-27T23:30:00'))).toBe('2026-09-27')
  })
})
