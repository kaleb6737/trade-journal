import Papa from 'papaparse'
import { CSV_FIELDS, CSV_PROFILES } from './csvProfiles'

export const CSV_MAX_BYTES = 2 * 1024 * 1024
export const CSV_MAX_ROWS = 2000

export function readCsv(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > CSV_MAX_BYTES) throw new Error('Choose a CSV smaller than 2 MB.')
  if (/^\s*</.test(text)) throw new Error('This looks like HTML/XML. Convert the closed-trades table to CSV; renaming the file does not convert it.')
  const parsed = Papa.parse(text.replace(/^\uFEFF/, ''), { skipEmptyLines: 'greedy', preview: CSV_MAX_ROWS + 2 })
  if (parsed.errors.length) throw new Error(`CSV could not be read: ${parsed.errors[0].message}`)
  const [rawHeaders, ...rows] = parsed.data
  if (!rawHeaders || !rows.length) throw new Error('No trade rows found. Include a header row and at least one completed trade.')
  if (rows.length > CSV_MAX_ROWS || parsed.meta.truncated) throw new Error('Limit each file to 2,000 trades. Export a smaller date range.')
  const headers = rawHeaders.map(h => h.trim())
  if (headers.some(h => !h) || new Set(headers).size !== headers.length) throw new Error('Headers must be unique and non-empty. Prepare one closed-trade table; remove statement titles and extra sections.')
  if (headers.length < 4) throw new Error('This is not a trade table. Use CSV with a header row, not a PDF or spreadsheet workbook.')
  return { headers, rows }
}

export function csvNumber(value, decimal = 'dot') {
  let s = String(value ?? '').trim().replace(/[$€£¥\s]/g, '')
  if (!s) throw new Error('missing number')
  let negative = false
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1) }
  const group = decimal === 'comma' ? '.' : ','
  const point = decimal === 'comma' ? ',' : '.'
  const escapedGroup = group === '.' ? '\\.' : ','
  const escapedPoint = point === '.' ? '\\.' : ','
  if (!new RegExp(`^[+-]?(?:\\d+|\\d{1,3}(?:${escapedGroup}\\d{3})+)(?:${escapedPoint}\\d+)?$`).test(s)) throw new Error('invalid number or decimal format')
  s = s.split(group).join('').replace(point, '.')
  const n = Number(s) * (negative ? -1 : 1)
  if (!Number.isFinite(n) || Math.abs(n) > 1e14) throw new Error('number outside supported range')
  return n
}

// Never use browser-local date parsing: the same upload must mean the same instant everywhere.
export function csvDate(value, { dateOrder, utcOffset }) {
  const s = String(value ?? '').trim()
  const m = s.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?\s*(AM|PM)?\s*(Z|[+-]\d{2}:?\d{2})?$/i)
  if (!m) throw new Error('use a full date and time, e.g. 2026-09-23 14:30:00')
  let y, month, day
  if (m[1].length === 4) [y, month, day] = [+m[1], +m[2], +m[3]]
  else if (dateOrder === 'MDY') [y, month, day] = [+m[3], +m[1], +m[2]]
  else if (dateOrder === 'DMY') [y, month, day] = [+m[3], +m[2], +m[1]]
  else throw new Error('choose month/day/year or day/month/year for this timestamp')
  let hour = +m[4]
  if (m[8]) {
    if (hour < 1 || hour > 12) throw new Error('invalid 12-hour clock')
    hour = hour % 12 + (m[8].toUpperCase() === 'PM' ? 12 : 0)
  }
  const minute = +m[5], second = +(m[6] || 0)
  const date = new Date(Date.UTC(y, month - 1, day, hour, minute, second, +(m[7] || '').padEnd(3, '0')))
  if (y < 1970 || y > 2100 || date.getUTCFullYear() !== y || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) throw new Error('invalid calendar date/time')
  const zone = m[9] || utcOffset
  if (!zone || !/^(Z|[+-]\d{2}:?\d{2})$/i.test(zone)) throw new Error('choose the UTC offset used in your export')
  const z = zone.replace(':', '')
  const offset = z.toUpperCase() === 'Z' ? 0 : (+z.slice(1, 3) * 60 + +z.slice(3, 5)) * (z[0] === '-' ? -1 : 1)
  if (Math.abs(offset) > 14 * 60 || (z !== 'Z' && +z.slice(3, 5) > 59)) throw new Error('invalid UTC offset')
  return new Date(date.getTime() - offset * 60000).toISOString()
}

export function prepareCsv(text, profile, mapping, options) {
  if (!CSV_PROFILES.some(p => p.id === profile && !p.legacy)) throw new Error('Choose a supported guided-import platform.')
  const { headers, rows } = readCsv(text)
  if (!mapping || !options || !['STOCK', 'OPTIONS', 'FUTURES', 'FOREX', 'CRYPTO'].includes(options.assetType)) throw new Error('Select an asset type.')
  if (!['net', 'gross'].includes(options.pnlMode)) throw new Error('Confirm whether reported P&L is net or gross.')
  if (!['dot', 'comma'].includes(options.decimal) || !['cost', 'signed'].includes(options.costMode)) throw new Error('Choose number and cost formats.')
  for (const [field, label, required] of CSV_FIELDS) {
    if (required && !mapping[field]) throw new Error(`Map ${label}. Raw fills cannot be imported as completed trades.`)
    if (mapping[field] && !headers.includes(mapping[field])) throw new Error(`Unknown column for ${label}.`)
  }
  const selected = CSV_FIELDS.map(([f]) => mapping[f]).filter(Boolean)
  if (new Set(selected).size !== selected.length) throw new Error('Map each source column only once; entry and exit must be separate.')
  const indices = Object.fromEntries(CSV_FIELDS.map(([f]) => [f, headers.indexOf(mapping[f])]))
  const trades = [], errors = []
  rows.forEach((row, index) => {
    try {
      if (row.length !== headers.length) throw new Error('Column count differs from the header. Remove totals, extra sections or malformed rows.')
      const get = f => indices[f] < 0 ? '' : String(row[indices[f]] ?? '').trim()
      const number = f => { try { return csvNumber(get(f), options.decimal) } catch (e) { throw new Error(`${f}: ${e.message}`) } }
      const symbol = get('symbol').toUpperCase()
      if (!symbol || symbol.length > 60) throw new Error('Missing or invalid symbol.')
      const side = new Map([['buy', 'LONG'], ['long', 'LONG'], ['b', 'LONG'], ['sell', 'SHORT'], ['short', 'SHORT'], ['s', 'SHORT']]).get(get('side').toLowerCase())
      if (!side) throw new Error('Opening direction must be Buy/Long or Sell/Short. Exclude deposits, orders and withdrawals.')
      const entryDate = csvDate(get('entryDate'), options), exitDate = csvDate(get('exitDate'), options)
      if (exitDate < entryDate) throw new Error('Exit precedes entry. Check date format and opening direction.')
      const entryPrice = number('entryPrice'), exitPrice = number('exitPrice'), quantity = number('quantity')
      if (quantity <= 0) throw new Error('Quantity must be positive; use opening direction for shorts.')
      const cost = f => {
        if (!mapping[f]) return 0
        const n = number(f)
        if (options.costMode === 'cost' && n < 0) throw new Error(`${f}: negative amount; select signed cash flows if charges are negative.`)
        return options.costMode === 'signed' ? -n : n
      }
      const commission = cost('commission'), fees = cost('fees'), swap = mapping.swap ? number('swap') : 0
      const reported = number('pnl')
      // Net exports already include charges/swap. Never subtract them a second time.
      const manualPnl = options.pnlMode === 'net' ? reported : reported - commission - fees + swap
      trades.push({ symbol, side, entryDate, exitDate, entryPrice, exitPrice, quantity,
        commission, fees: fees - swap, manualPnl, status: 'CLOSED', assetType: options.assetType,
        notes: `CSV import: ${profile}. Quantity retained in source units. Reported P&L treated as ${options.pnlMode}.`, sourceRow: index + 2 })
    } catch (e) { errors.push({ row: index + 2, message: e.message }) }
  })
  return { trades, errors, totalRows: rows.length, netPnl: trades.reduce((sum, t) => sum + t.manualPnl, 0) }
}
