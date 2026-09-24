// Export guidance checked against official platform documentation, 2026-09-23.
// Presets are suggestions, not a claim that every report version is supported.
export const CSV_PROFILES = [
  { id: 'tradovate', name: 'Tradovate', group: 'Futures', legacy: true,
    description: 'Use your existing Tradovate CSV importer.' },
  { id: 'topstepx', name: 'TopstepX', group: 'Futures', asset: 'FUTURES',
    description: 'Trades export · review column matches before importing.',
    steps: ['Select your account in TopstepX.', 'Open Trades (not Orders), choose Export and the date range.', 'Download the CSV. Check the opening direction and whether reported P&L includes fees.'],
    source: 'https://help.topstep.com/en/articles/14434175-topstepx' },
  { id: 'ninjatrader', name: 'NinjaTrader', group: 'Futures', asset: 'FUTURES',
    description: 'Trade Performance → Trades CSV.',
    steps: ['Open Trade Performance and select one account and date range.', 'Generate the report and select the Trades display.', 'Right-click the grid and export CSV. Use completed trades, not Executions or Orders.'],
    source: 'https://ninjatrader.com/support/helpGuides/nt8.pdf' },
  { id: 'ibkr', name: 'Interactive Brokers', group: 'Multi-asset', asset: 'STOCK', template: true,
    description: 'Guided template import · raw Flex executions are not yet reconstructed.',
    steps: ['Open Performance & Reports → Flex Queries and generate your account report.', 'Raw executions and closed-lot reports may not include both entry and exit details.', 'Prepare one completed trade per row using our template. Do not upload unpaired fills.'],
    source: 'https://www.ibkrguides.com/adminportal/performanceandstatements/flex.htm' },
  { id: 'tradestation', name: 'TradeStation', group: 'Multi-asset', asset: 'STOCK', template: true,
    description: 'Guided completed-trade mapping · report layouts vary.',
    steps: ['Open TradeManager Analysis; select one account and date range, then Generate.', 'Use actual account trades, not a backtest or performance-summary-only report.', 'Export trade details where available, then arrange one completed trade per row in our CSV template.'],
    source: 'https://help.tradestation.com/10_00/eng/tradestationhelp/spr_tma_reports/tma_generate_report.htm' },
  { id: 'thinkorswim', name: 'thinkorswim / Charles Schwab', group: 'Multi-asset', asset: 'STOCK', template: true,
    description: 'Guided template import · account-statement sections need preparation.',
    steps: ['Review your trades under Monitor → Account Statement in thinkorswim desktop.', 'Use your exported trade records to prepare the completed-trade CSV template.', 'Raw account statements, cash transactions and unpaired executions are not supported by this importer.'],
    source: 'https://www.youtube.com/watch?v=p-AohQ7oMhs' },
  { id: 'ctrader', name: 'cTrader', group: 'Forex platforms', asset: 'FOREX',
    description: 'History statement CSV · use opening direction and account-currency net P&L.',
    steps: ['In Trade Watch → History, select the account and period.', 'Open Statement and use Save to obtain the CSV.', 'Use completed positions with opening/closing times and account-currency net results. Do not map closing direction as entry direction.'],
    source: 'https://help.ctrader.com/ctrader/trading/history/' },
  { id: 'mt4', name: 'MetaTrader 4', group: 'Forex platforms', asset: 'FOREX', template: true,
    description: 'Converted CSV / template · native HTML reports are not CSV.',
    steps: ['In Terminal → Account History, select your desired period.', 'Save as Report produces HTML, not CSV. Open the report in a spreadsheet.', 'Copy only closed-trade rows to our template and save as CSV. Net P&L must include commission, swap and fees. Exclude deposits and withdrawals.'],
    source: 'https://www.metatrader4.com/en/trading-platform/help/overview/terminal/terminal_account_history' },
  { id: 'mt5', name: 'MetaTrader 5', group: 'Forex platforms', asset: 'FOREX', template: true,
    description: 'Converted CSV / template · raw Deals need pairing first.',
    steps: ['In Toolbox → History, choose your period and use Report.', 'Export the available HTML/Excel report, then prepare our completed-trade template in a spreadsheet.', 'Do not import raw Deals as trades. Pair entries/exits first and include commissions, swap and fees in net P&L.'],
    source: 'https://www.metatrader5.com/en/terminal/help/trading_advanced/history_report' },
  { id: 'other', name: 'Other broker / prop platform', group: 'Other', asset: 'STOCK', template: true,
    description: 'Use the completed-trade template or map equivalent columns.',
    steps: ['Export history from the platform where you placed trades, not the prop firm billing dashboard.', 'Prepare one completed trade per row using the downloadable template.', 'Include both entry and exit timestamps, prices, opening direction and net P&L in the destination account currency.'] },
]

export const CSV_FIELDS = [
  ['symbol', 'Symbol', true], ['side', 'Opening direction (Buy/Long or Sell/Short)', true],
  ['entryDate', 'Entry date/time', true], ['exitDate', 'Exit date/time', true],
  ['entryPrice', 'Entry price', true], ['exitPrice', 'Exit price', true],
  ['quantity', 'Quantity (contracts, shares or lots as reported)', true],
  ['pnl', 'Reported P&L (account currency)', true],
  ['commission', 'Commission'], ['fees', 'Other fees'], ['swap', 'Swap (signed credit/debit)'],
]

const COMMON = {
  symbol: ['Symbol', 'Instrument', 'Contract', 'Ticker'], side: ['Side', 'Direction', 'Market pos.', 'Type'],
  entryDate: ['Entry Date', 'Entry Time', 'Open Time', 'OpenedAt', 'OpenDate'],
  exitDate: ['Exit Date', 'Exit Time', 'Close Time', 'ClosedAt', 'CloseDate'],
  entryPrice: ['Entry Price', 'Open Price', 'EntryPrice'], exitPrice: ['Exit Price', 'Close Price', 'ExitPrice'],
  quantity: ['Quantity', 'Qty', 'Size', 'Volume', 'Lots'],
  pnl: ['Net P&L', 'Net Profit', 'Net Pnl', 'PnL', 'Profit', 'Gross P&L'],
  commission: ['Commission', 'Commissions'], fees: ['Fees'], swap: ['Swap'],
}
const PRESETS = {
  topstepx: { side: ['Type', 'Side'], entryDate: ['EnteredAt'], exitDate: ['ExitedAt'] },
  ninjatrader: { side: ['Market pos.'], pnl: ['Profit'] },
  ctrader: { side: ['Opening direction'], entryDate: ['Opening time'], exitDate: ['Closing time'],
    exitPrice: ['Closing price'], quantity: ['Closing quantity'], pnl: ['Net (currency)', 'Net realised'] },
}
const key = value => value.toLowerCase().replace(/[^a-z0-9]/g, '')
export function suggestMapping(headers, profile) {
  return Object.fromEntries(CSV_FIELDS.map(([field]) => {
    const aliases = [...(PRESETS[profile]?.[field] || []), ...(COMMON[field] || [])]
    return [field, aliases.map(alias => headers.find(h => key(h) === key(alias))).find(Boolean) || '']
  }))
}

export const CSV_TEMPLATE = 'Symbol,Side,Entry Date,Exit Date,Entry Price,Exit Price,Quantity,Net P&L,Commission,Fees,Swap\n'
