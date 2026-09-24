# Guided CSV imports

## Scope and verification (2026-09-23)

Journal → Import CSV opens a platform picker. Tradovate delegates to the pre-existing
parser unchanged. The new wizard supports completed-trade column mapping, not order
or execution reconstruction. These are not broker-certified import adapters. Tests
use synthetic fixtures; obtain anonymized real exports before advertising native
compatibility across report versions.

| Choice | Supported path | Official reference |
| --- | --- | --- |
| TopstepX | Trades export, review suggested columns; not Orders | https://help.topstep.com/en/articles/14434175-topstepx |
| NinjaTrader | Trade Performance / Trades CSV; review columns and profit convention | https://ninjatrader.com/support/helpGuides/nt8.pdf |
| Interactive Brokers | Prepared completed-trade template; raw Flex fills/closed lots need reconstruction outside this importer | https://www.ibkrguides.com/adminportal/performanceandstatements/flex.htm |
| TradeStation | Prepared closed trades from actual TradeManager Analysis records; not strategy backtests | https://help.tradestation.com/10_00/eng/tradestationhelp/spr_tma_reports/tma_generate_report.htm |
| thinkorswim / Schwab | Prepared completed-trade template; raw multi-section account statements are not parsed | https://www.youtube.com/watch?v=p-AohQ7oMhs |
| cTrader | History statement CSV containing complete opening/closing details | https://help.ctrader.com/ctrader/trading/history/ |
| MetaTrader 4 | Convert HTML closed-trade report to template CSV; exclude cash transactions | https://www.metatrader4.com/en/trading-platform/help/overview/terminal/terminal_account_history |
| MetaTrader 5 | Prepare closed trades from HTML/Excel report; raw Deals not paired | https://www.metatrader5.com/en/terminal/help/trading_advanced/history_report |
| Other broker/prop | Completed-trade template | No implied native integration |

Forex users choose the actual execution platform rather than their broker/prop's
brand. Report formats and available platforms vary by account and region.

## Safety / interpretation

- 2 MB CSV / 2,000 trade rows per file. Only CSV text is accepted, not XLSX, PDF or HTML.
- One account and asset type per file; user must confirm destination currency.
- Headers must be unique. Multi-section statements need preparation first.
- Both entry and exit date/time and prices, positive quantity, opening direction,
  symbol and reported P&L are required. No synthetic dates/prices or guessed P&L.
- Choose decimal separator, date order, UTC offset and net/gross explicitly.
  Embedded timestamp offsets override the chosen offset. Split naive-timestamp
  exports at DST changes. No implicit browser timezone parsing.
- Net P&L is preserved. Gross P&L subtracts costs and adds signed swap. Commission
  and fee convention is selected explicitly; absent optional costs mean zero.
- Swap is stored as negative fees for a credit, positive fees for a charge.
- Source quantity units are retained. No lot/multiplier/currency conversion.
  Return percent is left null rather than inventing a capital basis.
- All rows are checked in-browser and again on the server. Any invalid row blocks
  the entire new import. Writes run in a database transaction.
- The server requires a session, CSV-plan entitlement and ownership of the account.
- Same-file retry protection uses normalized file SHA-256 + source row + platform +
  destination account, under the existing user/externalRef unique constraint.
  Concurrent imports are serialized per user using a PostgreSQL advisory lock.
- This does NOT detect overlap between different files, platform selections, manual
  trades or API broker sync. It does not merge duplicate-looking rows in one file.
  Changing a mapping and reimporting the same file does not revise saved trades.
- Original CSV text is parsed transiently, not stored or logged. Source account
  identifiers are not copied into notes; the selected platform is retained.

## Architecture

- `src/lib/csvProfiles.js`: picker choices, guidance links, header suggestions, template.
- `src/lib/csvImport.js`: pure shared parsing / validation.
- `src/components/trading/CsvImportWizard.js`: lazy-loaded picker and review workflow.
- `src/app/api/trades/import/route.js`: authenticated atomic write and same-file retry handling.
- Existing Tradovate bulk endpoint and parsing behavior remain unchanged.

## Remaining work before native-format claims

Collect consented, anonymized exports covering long/short, partial exits, fees,
rebates, DST, locale and multi-currency cases for each platform. Compare row counts
and P&L to the source. Add certified format adapters only after this evidence exists.
IBKR/TOS raw execution pairing, MT HTML/XLSX parsing, cross-export deduplication,
and import-batch undo are not included in this version.

Run `npm test` for parser and mocked API tests. Live database integration and signed-in
browser verification require a working environment and an account; unit tests do
not certify those services.
