# Analytics Edge Lab

The default Analytics tab now uses logged R to investigate expectancy, variance and execution. Existing dollar and R views remain available. Shared local-date, account, symbol, direction and playbook filters apply to all tabs. History loads in pages, with HTTP failures displayed and a retry action. No schema changes are needed by this feature.

## Research views

- R expectancy, median, profit factor, coverage and drawdown from zero.
- Equity, underwater and full-window rolling expectancy charts.
- Segment comparisons by playbook, instrument, session, direction, weekday, focus and tags; sample floor and CSV export.
- 800-resample percentile bootstrap interval for mean R.
- Chronological half comparisons, expectancy without the best trade, worst-decile mean, losing streak and time below peak.
- 500-path IID resampling experiment with 25–200 trade horizons, additional R friction, pointwise 5th–95th percentile bands, ending loss frequency and 95th percentile maximum drawdown.
- Entry weekday/time heatmap, mistake associations and underlying trade links.

## Semantics

Only non-hidden CLOSED trades with recorded finite R and a valid occurredAt/exitDate/entryDate are included in R research. Missing R is not inferred. Dates for filtering are local realization dates; timing heatmaps use local entry time. Tag and mistake groups overlap and must not be summed. Samples use logged R without assuming whether costs were included.

Expectancy includes 0R. Anatomy's decided win rate excludes 0R to compare against the payoff-derived break-even rate. Segment table win rate includes 0R and is labeled. No-loss profit factor is infinity only when gross wins are positive, otherwise undefined. Simulation is additive R, not compounded account equity. Independent resampling does not model regime changes or serial dependence, and evidence labels do not certify an edge.

## Validation

`npm test` includes edgeAnalytics.test.js covering known results, zero/empty/all-win/all-loss cases, hidden/open/missing/invalid rows, date ordering, full windows, label collisions, overlapping tags, inclusive filters, bootstrap reproducibility and constant-path simulation oracles.

Visual QA checklist: authenticated Analytics at desktop and 375px; filter reset and empty results; equity/drawdown/rolling toggle; dimensions and sample floor; CSV export; simulation horizon/friction/resample; heatmap selection; journal/playbook links; fetch-error retry. A browser connection is required for this checklist.
