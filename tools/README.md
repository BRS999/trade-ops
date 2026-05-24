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
- [regime.mjs](/Users/benjaminspencer/git/trade-ops/tools/regime.mjs)
- [new-token.mjs](/Users/benjaminspencer/git/trade-ops/tools/new-token.mjs)
- [rugcheck.mjs](/Users/benjaminspencer/git/trade-ops/tools/rugcheck.mjs)
- [binance-futures.mjs](/Users/benjaminspencer/git/trade-ops/tools/binance-futures.mjs)
- [hyperliquid.mjs](/Users/benjaminspencer/git/trade-ops/tools/hyperliquid.mjs)
- [deribit.mjs](/Users/benjaminspencer/git/trade-ops/tools/deribit.mjs)
- [coinbase.mjs](/Users/benjaminspencer/git/trade-ops/tools/coinbase.mjs)
- [kraken.mjs](/Users/benjaminspencer/git/trade-ops/tools/kraken.mjs)
- [polymarket.mjs](/Users/benjaminspencer/git/trade-ops/tools/polymarket.mjs)
- [defillama.mjs](/Users/benjaminspencer/git/trade-ops/tools/defillama.mjs)
- [bls.mjs](/Users/benjaminspencer/git/trade-ops/tools/bls.mjs)
- [fiscaldata.mjs](/Users/benjaminspencer/git/trade-ops/tools/fiscaldata.mjs)
- [chronos.mjs](/Users/benjaminspencer/git/trade-ops/tools/chronos.mjs)
- [timesfm.mjs](/Users/benjaminspencer/git/trade-ops/tools/timesfm.mjs)
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

The Kronos tool runs local native forecasts with an isolated Python environment under `tmp/`.

Current commands:

- `setup`
- `check`
- `example`
- `forecast <symbol> [--range 6mo] [--interval 1d] [--lookback 100] [--pred-len 5]`

The Amazon Chronos tool runs local probabilistic forecasts from candle closes.

Current commands:

- `setup`
- `check`
- `example`
- `forecast <symbol> [--range 6mo] [--interval 1d] [--prediction-length 8] [--samples 64] [--local-files-only]`

The Regime tool classifies market context from candles and breadth.

Current commands:

- `crypto [--range 1mo] [--interval 1h] [--include-memes] [--save]`
- `symbol <symbol> [--range 1mo] [--interval 1h] [--save]`

The New Token tool triages ultra-new tokens from DexScreener discovery feeds and enriches Solana safety data with RugCheck when available.

Current commands:

- `scan [--source latest-boosted] [--chain solana] [--limit 10] [--save]`
- `token <chain> <tokenAddress> [--save]`

Labels include `untradeable`, `too_early`, `watch_launch`, `scalp_only`, `candidate_after_retest`, and `paper_trade_candidate`.

The RugCheck tool is a thin wrapper over RugCheck token safety endpoints.

Current commands:

- `summary <mint>`
- `report <mint>`
- `safety <mint>`
- `lockers <mint>`
- `votes <mint>`
- `bulk-summary <mint1,mint2>`
- `bulk-reports <mint1,mint2>`
- `new`
- `recent`
- `trending`
- `verified`
- `ping`

The Binance Futures tool is a read-only wrapper over public USD-M futures market data.

Binance may return HTTP 451 from restricted regions. Use Hyperliquid as the practical fallback for crypto-derivatives context when that happens.

Current commands:

- `premium <symbol>`
- `open-interest <symbol>`
- `funding <symbol> [--limit 24]`
- `oi-history <symbol> [--period 15m]`
- `long-short <symbol> [--period 15m]`
- `taker-flow <symbol> [--period 15m]`
- `snapshot [BTCUSDT,ETHUSDT,SOLUSDT]`

The Hyperliquid tool is a read-only wrapper over public perpetual market data.

Current commands:

- `mids`
- `meta`
- `snapshot [BTC,ETH,SOL]`

The Deribit tool is a read-only wrapper over public BTC/ETH options and futures data.

Current commands:

- `instruments [--currency BTC] [--kind option|future]`
- `summary [--currency BTC] [--kind option|future]`
- `orderbook <instrumentName> [--depth 10]`
- `vol-index [BTC|ETH]`
- `options-snapshot [BTC,ETH]`

The Coinbase and Kraken tools provide US-accessible public spot venue confirmation.

Current Coinbase commands:

- `products [--limit 100]`
- `product <productId>`
- `book <productId> [--limit 50]`
- `candles <productId> [--granularity ONE_HOUR] [--start ISO] [--end ISO]`
- `snapshot [BTC-USD,ETH-USD,SOL-USD]`

Current Kraken commands:

- `pairs [pair]`
- `ticker <pair>`
- `book <pair> [--count 50]`
- `ohlc <pair> [--interval 60] [--since unix]`
- `snapshot [XBTUSD,ETHUSD,SOLUSD]`

The Polymarket tool is a read-only wrapper over public market/event discovery and CLOB order-book data.

Current commands:

- `markets [--limit 100] [--active true] [--order volume24hr]`
- `events [--limit 100] [--active true]`
- `market <id>`
- `event <id>`
- `book <clobTokenId>`
- `scan [--limit 100]`

The DeFiLlama tool is a read-only wrapper over public crypto ecosystem data.

Current commands:

- `chains`
- `protocols`
- `stablecoins`
- `stablecoin-chains`
- `dexs [chain]`
- `fees [chain]`
- `yields`
- `snapshot [--limit 12]`

The BLS tool is a read-only wrapper over official U.S. labor and CPI time series.

Current commands:

- `known-series`
- `series <id1,id2> [--start-year YYYY] [--end-year YYYY]`
- `macro [--start-year YYYY] [--end-year YYYY]`

The FiscalData tool is a read-only wrapper over official U.S. Treasury fiscal data.

Current commands:

- `debt [--limit 10]`
- `securities-sales [--limit 10]`
- `dts [--limit 10]`
- `snapshot [--limit 5]`

The DTS host can be intermittently unavailable by DNS from some environments; `snapshot` uses the FiscalData endpoints that resolve here.

The TimesFM tool runs local TimesFM 2.5 forecasts from candle closes.

Current commands:

- `setup`
- `check`
- `example`
- `forecast <symbol> [--range 6mo] [--interval 1d] [--prediction-length 8] [--max-context 1024] [--local-files-only]`

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
