# Tools

This module owns local helper tools and scripts exposed by Trade Ops.

Examples:

- journal helpers
- watchlist scanners
- review helpers
- adapter wrappers
- future MCP-facing tools

## Current Tools

- [tradingview.mjs](/Users/benjaminspencer/git/trade-ops/tools/tradingview.mjs)
- [sec-edgar.mjs](/Users/benjaminspencer/git/trade-ops/tools/sec-edgar.mjs)
- [yahoo.mjs](/Users/benjaminspencer/git/trade-ops/tools/yahoo.mjs)
- [massive.mjs](/Users/benjaminspencer/git/trade-ops/tools/massive.mjs)
- [kronos.mjs](/Users/benjaminspencer/git/trade-ops/tools/kronos.mjs)
- [kalshi.mjs](/Users/benjaminspencer/git/trade-ops/tools/kalshi.mjs)

The TradingView tool is a thin operator-friendly wrapper over the internal TradingView adapter.

Current commands:

- `account`
- `positions`
- `orders`
- `history`
- `chart`
- `indicators`
- `symbol <symbol>`
- `timeframe <timeframe>`
- `buy <symbol> <quantity> [market|limit] [limitPrice]`
- `sell <symbol> <quantity> [market|limit] [limitPrice]`
- `close <symbol>`
- `cancel <orderId|symbol>`

The SEC EDGAR tool is a thin operator-friendly wrapper over the public filings adapter.

Current commands:

- `resolve <tickerOrCik>`
- `submissions <tickerOrCik>`
- `filings <tickerOrCik> [--forms 10-K,10-Q,8-K] [--limit 10]`
- `facts <tickerOrCik>`
- `latest-10k <tickerOrCik>`
- `latest-10q <tickerOrCik>`
- `recent-8k <tickerOrCik> [--limit 5]`
- `facts-concept <tickerOrCik> <concept> [--limit 10]`

The Yahoo tool is a thin operator-friendly wrapper over the public quote and history adapter.

Current commands:

- `quote <symbol>`
- `quotes <symbol1,symbol2,...>`
- `bars <symbol> [--range 3mo] [--interval 1d]`

The Massive tool is intentionally narrow and only exposes the parts that are differentiated from Yahoo.

Current commands:

- `snapshot <ticker>`
- `prev-day <ticker>`
- `ticker-details <ticker>`
- `financials <ticker> [--timeframe quarterly] [--limit 4]`
- `bars <ticker> --from YYYY-MM-DD --to YYYY-MM-DD [--timespan day] [--multiplier 1] [--limit 120]`

The Kronos tool supports both a Docker experiment path and a native macOS path for Apple Silicon.

Current commands:

- `native-setup`
- `native-check`
- `native-example`
- `up`
- `down`
- `ps`
- `shell`
- `check`
- `example`

The Kalshi tool is a read-only wrapper over public prediction-market endpoints.

Current commands:

- `status`
- `markets [--limit 100] [--status open] [--series KXBTC] [--event <event_ticker>] [--cursor <cursor>]`
- `market --ticker <market_ticker>`
- `orderbook --ticker <market_ticker> [--depth 50]`
- `trades [--ticker <market_ticker>] [--limit 100] [--cursor <cursor>] [--min-ts <unix>] [--max-ts <unix>]`
- `events [--limit 100] [--status open] [--series <series_ticker>] [--cursor <cursor>]`
- `event --event <event_ticker>`
- `series [--limit 400] [--category Economics] [--cursor <cursor>]`
