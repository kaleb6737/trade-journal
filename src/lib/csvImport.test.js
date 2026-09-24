import { describe, it, expect } from 'vitest'
import { csvDate, csvNumber, prepareCsv, readCsv, CSV_MAX_ROWS } from './csvImport'
import { CSV_PROFILES, CSV_TEMPLATE, suggestMapping } from './csvProfiles'

// Synthetic contract fixtures, NOT broker-certified sample exports.
const header = CSV_TEMPLATE.trim()
const data = 'MESZ6,Buy,2026-09-23 09:30:00,2026-09-23 09:35:00,5000,5001,2,8,2,0,0'
const csv = `${header}\n${data}`
const options = { assetType: 'FUTURES', dateOrder: 'YMD', utcOffset: '-04:00', pnlMode: 'net', decimal: 'dot', costMode: 'cost' }
const parse = (text = csv, profile = 'topstepx', opts = {}) => prepareCsv(text, profile, suggestMapping(readCsv(text).headers, profile), { ...options, ...opts })

describe('CSV import contracts', () => {
  it('preserves source P&L without applying a stock multiplier or double-charging commission', () => {
    const p = parse()
    expect(p.errors).toEqual([])
    expect(p.trades[0]).toMatchObject({ manualPnl: 8, commission: 2, entryDate: '2026-09-23T13:30:00.000Z', quantity: 2, side: 'LONG' })
  })
  it('supports every non-legacy profile through the explicit completed-trade template', () => {
    for (const profile of CSV_PROFILES.filter(p => !p.legacy)) expect(parse(csv, profile.id).errors).toEqual([])
  })
  it('keeps Tradovate out of the new parser', () => expect(() => parse(csv, 'tradovate')).toThrow('guided-import'))
  it('matches NinjaTrader column suggestions', () => {
    const text = 'Instrument,Market pos.,Entry time,Exit time,Entry price,Exit price,Quantity,Profit,Commission\nMESZ6,Short,09/23/2026 9:30:00 AM,09/23/2026 9:35:00 AM,5001,5000,2,10,2'
    expect(parse(text, 'ninjatrader', { dateOrder: 'MDY', pnlMode: 'gross' }).trades[0]).toMatchObject({ side: 'SHORT', manualPnl: 8 })
  })
  it('matches cTrader opening direction and accounts for signed swap', () => {
    const text = 'Symbol,Opening direction,Opening time,Closing time,Entry price,Closing price,Closing quantity,Net (currency),Commissions,Swap\nEURUSD,Buy,2026-09-23 09:00,2026-09-23 10:00,1.1,1.2,0.1,95,-3,-2'
    const p = parse(text, 'ctrader', { assetType: 'FOREX', costMode: 'signed' })
    expect(p.trades[0]).toMatchObject({ manualPnl: 95, commission: 3, fees: 2, quantity: 0.1 })
  })
  it('requires explicit P&L interpretation', () => expect(() => parse(csv, 'topstepx', { pnlMode: '' })).toThrow('net or gross'))
  it('handles gross forex P&L with charges and credits', () => {
    const text = `${header}\nEURUSD,Sell,2026-09-23 09:00,2026-09-23 10:00,1.2,1.1,0.1,100,-3,-1,2`
    expect(parse(text, 'mt5', { assetType: 'FOREX', pnlMode: 'gross', costMode: 'signed' }).trades[0].manualPnl).toBe(98)
  })
  it('blocks an entire import when a row is malformed', () => {
    const result = parse(`${csv}\n${data.replace(',Buy,', ',balance,')}`)
    expect(result.trades).toHaveLength(1)
    expect(result.errors[0].row).toBe(3)
  })
  it.each(['0', '-1', 'NaN', 'Infinity', '1x'])('rejects invalid quantity %s', qty => {
    expect(parse(`${header}\n${data.replace(',2,8,', `,${qty},8,`)}`).errors).toHaveLength(1)
  })
  it('rejects prototype property names as sides', () => expect(parse(csv.replace(',Buy,', ',constructor,')).errors).toHaveLength(1))
  it('rejects reversed timestamps', () => expect(parse(csv.replace('09:35:00', '08:35:00')).errors).toHaveLength(1))
  it('rejects duplicate field mappings', () => {
    const mapping = suggestMapping(readCsv(csv).headers, 'topstepx')
    mapping.exitDate = mapping.entryDate
    expect(() => prepareCsv(csv, 'topstepx', mapping, options)).toThrow('only once')
  })
  it('rejects raw execution tables with no exit details', () => expect(() => parse('Symbol,Side,Price,Quantity\nES,Buy,5000,1')).toThrow('Raw fills'))
  it('reads BOMs and CRLF files', () => expect(parse(`\uFEFF${csv.replace(/\n/g, '\r\n')}`).errors).toEqual([]))
  it('accepts semicolon-separated decimal comma CSV', () => {
    const text = header.replace(/,/g, ';') + '\nEURUSD;Buy;2026-09-23 09:00;2026-09-23 10:00;1,1;1,2;0,1;95,25;3;0;0'
    expect(parse(text, 'mt4', { decimal: 'comma' }).netPnl).toBe(95.25)
  })
  it.each(['<html>report</html>', '<xml>report</xml>'])('rejects renamed markup', text => expect(() => readCsv(text)).toThrow('HTML/XML'))
  it('rejects duplicate headers', () => expect(() => readCsv('Symbol,Side,Price,Price\nES,Buy,1,2')).toThrow('unique'))
  it('rejects empty files', () => expect(() => readCsv('')).toThrow())
  it('rejects oversized files', () => expect(() => readCsv('x'.repeat(2 * 1024 * 1024 + 1))).toThrow('2 MB'))
  it('bounds the row count', () => expect(() => readCsv(`${header}\n${Array(CSV_MAX_ROWS + 1).fill(data).join('\n')}`)).toThrow('2,000'))
})

describe('unambiguous numeric and date parsing', () => {
  it.each([['$(1,234.56)', -1234.56], ['($1,234.56)', -1234.56], ['$0.00', 0], ['-2.50', -2.5]])('parses %s', (s, n) => expect(csvNumber(s)).toBe(n))
  it('rejects partial numbers and mixed separators', () => { expect(() => csvNumber('12junk')).toThrow(); expect(() => csvNumber('1,23')).toThrow() })
  it('keeps explicit timestamp offsets', () => expect(csvDate('2026-09-23T09:30:00+02:00', options)).toBe('2026-09-23T07:30:00.000Z'))
  it('handles milliseconds and UTC', () => expect(csvDate('2026-09-23T09:30:00.12Z', options)).toBe('2026-09-23T09:30:00.120Z'))
  it('rejects impossible dates', () => expect(() => csvDate('2026-02-30 10:00', options)).toThrow('calendar'))
  it('requires offset for naive dates', () => expect(() => csvDate('2026-09-23 10:00', { ...options, utcOffset: '' })).toThrow('offset'))
  it('does not silently interpret ambiguous US/European dates', () => expect(() => csvDate('09/10/2026 10:00', options)).toThrow('choose'))
  it('handles day-first dates and midnight', () => expect(csvDate('23.09.2026 12:00 AM', { ...options, dateOrder: 'DMY', utcOffset: 'Z' })).toBe('2026-09-23T00:00:00.000Z'))
})
