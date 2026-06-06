# Tools

CLI entry points over the adapters. Run via `npm run <name> -- <command>`.

---

## Trading

### alpaca
Paper and live trading via Alpaca. Defaults to **paper** — add `--live` to touch the live account.

Crypto trades 24/7 and fills immediately. Equity orders queue for market open.

**Crypto exit workflow:** Alpaca does not support OCO for crypto. Place a `stop_limit` sell for downside protection; when price reaches target, call `close <symbol>` which fills and auto-cancels the stop.

**Equity exit workflow:** Use `--take-profit` and `--stop-loss` on `buy` to create a bracket order. Both legs activate on fill as a linked OCO pair — first to fill cancels the other.

- `account` — equity, cash, buying power, day P&L
- `clock` — market open/closed, next open/close
- `history [--period 1W] [--timeframe 1D]` — portfolio P&L history
- `activities [--type FILL] [--limit 50]`
- `positions` — all open positions
- `position <symbol>`
- `close <symbol> [--qty N] [--pct N]`
- `close-all`
- `orders [--status open|closed|all] [--limit 50]`
- `order <order_id>`
- `cancel <order_id>` / `cancel-all`
- `buy <symbol> --qty N [--type market|limit|stop|stop_limit|trailing_stop] [--tif day|gtc|ioc|fok] [--limit PRICE] [--stop PRICE] [--trail PRICE | --trail-pct PCT] [--take-profit PRICE] [--stop-loss PRICE] [--notional DOLLARS] [--extended]`
- `sell <symbol> --qty N [same options as buy]`
- `oco-exit <symbol> --qty N --take-profit PRICE --stop-loss PRICE [--stop-limit PRICE]` — equity OCO exit for existing positions
- `replace <order_id> [--limit PRICE] [--stop PRICE] [--qty N] [--tif TIF]`
- `asset <symbol>` — tradeable, fractionable, shortable
- `tradeable <symbol>`

Market data (same keys, `data.alpaca.markets` — primary fallback when Yahoo is rate-limited):
- `bars <symbol> [--start YYYY-MM-DD] [--end YYYY-MM-DD] [--timeframe 1Day] [--limit 500]` — stocks and Alpaca crypto pairs such as `BTCUSD` or `BTC/USD`
- `price <symbol>` — latest trade price
- `snapshot <symbol1> <symbol2> ...` — latest trade, quote, and daily bar

Periods for `history`: `1D 1W 1M 3M 6M 1A` — Timeframes: `1Min 5Min 15Min 1H 1D`

---

## Market Data

### yahoo
Live quotes, historical bars, and options chains.

- `quote <symbol>`
- `quotes <symbol1,symbol2,...>`
- `bars <symbol> [--range 3mo] [--interval 1d]`
- `expiries <symbol>`
- `atm <symbol>`
- `chain <symbol> [--expiry YYYY-MM-DD] [--type calls|puts|all] [--strikes N]`

### massive
Historical OHLCV and fundamentals via Polygon. Use for bars and financials not available on Yahoo.

- `snapshot <ticker>`
- `prev-day <ticker>`
- `ticker-details <ticker>`
- `financials <ticker> [--timeframe quarterly] [--limit 4]`
- `bars <ticker> --from YYYY-MM-DD --to YYYY-MM-DD [--timespan day] [--multiplier 1] [--limit 120]`

### fmp
Analyst consensus, price targets, estimates, and earnings calendar.

- `summary <symbol>`
- `targets <symbol>`
- `estimates <symbol>`
- `earnings [--symbol AAPL] [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--limit 10]`
- `calendar [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--country US] [--high]`

### finnhub
Insider flow, congressional trades, earnings, news sentiment, analyst consensus.

- `quote <symbol>`
- `profile <symbol>`
- `financials <symbol> [all|price|valuation|margin|growth|...]`
- `peers <symbol>`
- `snapshot <symbol>`
- `insider-transactions <symbol> [--from YYYY-MM-DD] [--to YYYY-MM-DD]`
- `insider-sentiment <symbol> <from> <to>`
- `congressional <symbol> <from> <to>`
- `social-sentiment <symbol> [--from YYYY-MM-DD] [--to YYYY-MM-DD]`
- `news <symbol> <from> <to>`
- `news-sentiment <symbol>`
- `market-news [general|forex|crypto|merger]`
- `earnings-calendar [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--symbol PLTR]`
- `earnings <symbol> [--limit 4]`
- `upgrades [--symbol PLTR] [--from YYYY-MM-DD] [--to YYYY-MM-DD]`
- `price-target <symbol>`
- `recommendations <symbol>`
- `economic-calendar [--from YYYY-MM-DD] [--to YYYY-MM-DD]`

### securitiesdb
Form 4 insider transactions and 13F smart-money flow. No API key required.

- `snapshot <symbol>`
- `insiders <symbol>`
- `institutional <symbol>`
- `raw <symbol>`

### sec-edgar
SEC filings and company facts via EDGAR public API.

- `resolve <tickerOrCik>`
- `submissions <tickerOrCik>`
- `filings <tickerOrCik> [--forms 10-K,10-Q,8-K] [--limit 10]`
- `facts <tickerOrCik>`
- `latest-10k <tickerOrCik>`
- `latest-10q <tickerOrCik>`
- `recent-8k <tickerOrCik> [--limit 5]`
- `facts-concept <tickerOrCik> <concept> [--limit 10]`

### alphavantage
News sentiment, commodity prices, market movers, earnings calendar. ⚠ Free tier: 25 req/day.

- `gainers-losers`
- `market-status`
- `news [--tickers NVDA,PLTR] [--topics technology] [--limit 20]`
- `earnings-calendar [--symbol NVDA] [--horizon 3month|6month]`
- `quote <symbol>`
- `search <keywords>`
- `bars <symbol> [--output-size compact|full]`
- `commodity <name> [--interval monthly|weekly|daily]`
- `commodities`
- `economic <indicator> [--interval monthly] [--maturity 10year]`

### chart-state
Source-agnostic candle facts for LLM analysis. This does not fetch market data and does not recommend trades; pass candles from Alpaca, Yahoo, GeckoTerminal, DexScreener, or another adapter.

- `--input candles.json [--symbol GEV] [--timeframe 1Day]`
- `--input - [--symbol BTC-USD] [--timeframe 1d]`

### agentmail
Email delivery for generated reports via AgentMail. This is a delivery adapter only; write the market read or memo first, then send that artifact.

- `inboxes [--json]` — list available AgentMail inboxes
- `send --inbox <id> --to <email> --subject <text> --text <body>`
- `send --input reports/market-reads/YYYY-MM-DD.md --subject "Morning Read"`

Defaults: `AGENTMAIL_API_KEY`, `AGENTMAIL_INBOX_ID`, and `MARKET_READ_EMAIL_TO`.

---

## Macro & Economic

### fred
FRED time series, macro snapshot, and release calendar.

- `macro`
- `latest <series_id>`
- `observations <series_id> [--limit 10] [--sort asc|desc] [--from YYYY-MM-DD] [--to YYYY-MM-DD]`
- `series <series_id>`
- `calendar [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--high]`

### bls
Official BLS labor and CPI time series.

- `known-series`
- `series <id1,id2> [--start-year YYYY] [--end-year YYYY]`
- `macro [--start-year YYYY] [--end-year YYYY]`

### bea
BEA national accounts — GDP, PCE, GDP-by-industry, state data. Requires `BEA_API_KEY`.

- `datasets`
- `params <datasetname>`
- `snapshot`
- `gdp [--frequency Q] [--year 2024,2023]`
- `pce [--frequency M]`
- `gdp-by-industry [--frequency A] [--year 2024,2023,2022]`
- `state-gdp [--year 2024,2023]`
- `state-income [--year 2024,2023]`
- `regional <tableName> [--geo-fips STATE] [--line-code 1] [--year 2024]`
- `international [--indicator BalCurrentAcct] [--frequency Q]`
- `input-output [--table-id 259] [--year 2023]`

### eia
EIA energy prices and inventory reports. Key releases: crude Wed ~10:30am ET, nat gas Thu ~10:30am ET.

- `snapshot`
- `wti [--limit 10] [--start YYYY-MM-DD] [--end YYYY-MM-DD]`
- `brent [--limit 10]`
- `crude-prices [--limit 5]`
- `crude-stocks [--limit 8]`
- `spr [--limit 8]`
- `natgas-storage [--limit 8]`
- `production [--limit 6]`

### fiscaldata
US Treasury fiscal data — debt, auctions, Daily Treasury Statement.

- `debt [--limit 10]`
- `securities-sales [--limit 10]`
- `dts [--limit 10]`
- `snapshot [--limit 5]`

### cftc
CFTC Commitments of Traders — futures positioning for rates, FX, indices, commodities. No API key.

- `cot <instrument>`
- `snapshot [instrument1 instrument2 ...]`
- `instruments`

Instruments: `gold silver copper crude natgas soybeans corn wheat coffee spx ndx eurusd usdjpy dxy bitcoin`

---

## Sentiment & Flow

### fng
Fear & Greed indices — crypto (alternative.me) and equity (CNN). No API key.

- `current` — crypto F&G
- `history [days]` — crypto F&G history
- `equity` — CNN equity composite score + week/month/year comparisons
- `equity-snapshot` — CNN composite + all 7 sub-indicators (put/call, VIX, momentum, breadth, junk bonds, safe haven)

### finra
FINRA daily short sale volume. No API key. Published ~6pm ET each trading day.

- `symbol <SYMBOL> [YYYY-MM-DD]`
- `multi <SYM1> <SYM2> ...`
- `top [n=25] [minVol=100000]`

⚠ Short VOLUME (daily flow), not short INTEREST (open positions). Persistently high `short_pct` (>50%) alongside price weakness = active distribution.

### gdelt
GDELT geopolitical news — keyword/theme/country search, tone and volume timelines. No API key.

GDELT enforces one request per 5 seconds; the client handles this automatically.

- `search <query> [--timespan 7d] [--max-records 50]`
- `articles [--keyword TEXT] [--theme KEY] [--source-country COUNTRY] [--timespan 7d] [--max-records 50]`
- `volume <query> [--timespan 7d] [--raw]`
- `tone <query> [--timespan 7d]`
- `tone-chart <query> [--timespan 7d]`
- `languages <query> [--timespan 7d]`
- `countries <query> [--timespan 7d]`
- `snapshot <query>|--keyword ... [--timespan 7d] [--max-records 25]`
- `themes`

---

## Crypto

### coingecko
Aggregated crypto prices, market stats, trending, corporate/sovereign treasury holdings.

- `ping` / `global` / `defi` / `snapshot` / `trending` / `exchange-rates`
- `categories [--order market_cap_change_24h_desc]`
- `search <query>`
- `price <id1,id2,...> [--change] [--vol]`
- `markets [--ids id1,id2] [--category defi] [--per-page 50]`
- `coin <coinId>`
- `ohlc <coinId> [--days 30]`
- `chart <coinId> [--days 7] [--interval daily]`
- `corporate-btc [bitcoin|ethereum]`
- `sovereign-btc`
- `treasury <entityId>`
- `treasury-chart <entityId> [coinId] [days]`
- `treasury-txns <entityId>`

### gecko
On-chain DEX data via GeckoTerminal — Solana pools, trending, OHLCV.

- `solana`
- `trending [duration]`
- `trending-network <network> [duration]`
- `new` / `new-network <network>`
- `top-pools <network>`
- `dex-pools <network> <dex>`
- `pool <network> <address>`
- `pool-trades <network> <address>`
- `ohlcv <network> <address> [timeframe] [aggregate] [limit]`
- `token <network> <address>`
- `token-price <network> <address>`

### dex
Cross-chain pair search and token discovery via DexScreener.

- `search <query> [limit]`
- `pair <chain> <pairAddress>`
- `pairs-by-tokens <addr1,addr2> [limit]`
- `latest-profiles [limit]`
- `latest-boosted [limit]`
- `top-boosted [limit]`
- `orders <chain> <tokenAddress> [limit]`

### etherscan
Ethereum on-chain data — balances, transactions, gas, ETH price. Requires `ETHERSCAN_API_KEY`.

Supports multi-chain via `--chain <id>` (default: 1=Ethereum; also 10=Optimism, 8453=Base, 42161=Arbitrum, 137=Polygon).

- `balance <address>`
- `tokens <address>`
- `txs <address>`
- `token-txs <address>`
- `gas`
- `price`
- `block`
- `snapshot <address>`

### binance-futures
Binance USD-M perpetuals — funding, OI, long/short, taker flow. May return 451 from restricted regions; use `hyperliquid` as fallback.

- `premium <symbol>`
- `open-interest <symbol>`
- `funding <symbol> [--limit 24]`
- `oi-history <symbol> [--period 15m]`
- `long-short <symbol> [--period 15m]`
- `taker-flow <symbol> [--period 15m]`
- `snapshot [BTCUSDT,ETHUSDT,SOLUSDT]`

### hyperliquid
Hyperliquid perpetuals — US-accessible fallback for Binance 451s.

- `mids`
- `meta`
- `snapshot [BTC,ETH,SOL]`

### deribit
BTC/ETH options surface, vol index, OI, and futures data.

- `instruments [--currency BTC] [--kind option|future]`
- `summary [--currency BTC] [--kind option|future]`
- `orderbook <instrumentName> [--depth 10]`
- `vol-index [BTC|ETH]`
- `options-snapshot [BTC,ETH]`

### coinbase
US spot venue confirmation — order book, candles, snapshot.

- `products [--limit 100]`
- `product <productId>`
- `book <productId> [--limit 50]`
- `candles <productId> [--granularity ONE_HOUR] [--start ISO] [--end ISO]`
- `snapshot [BTC-USD,ETH-USD,SOL-USD]`

### kraken
Spot venue — ticker, order book, OHLC.

- `pairs [pair]`
- `ticker <pair>`
- `book <pair> [--count 50]`
- `ohlc <pair> [--interval 60] [--since unix]`
- `snapshot [XBTUSD,ETHUSD,SOLUSD]`

### defillama
DeFi TVL, stablecoins, DEX volumes, protocol fees.

- `chains` / `protocols` / `stablecoins` / `stablecoin-chains`
- `dexs [chain]`
- `fees [chain]`
- `yields`
- `snapshot [--limit 12]`

### rugcheck
Solana token safety — risk score, holder concentration, liquidity locks.

- `summary <mint>` / `report <mint>` / `safety <mint>`
- `lockers <mint>` / `votes <mint>`
- `bulk-summary <mint1,mint2>` / `bulk-reports <mint1,mint2>`
- `new` / `recent` / `trending` / `verified` / `ping`

### new-token
Triage ultra-new tokens from DexScreener discovery feeds with RugCheck enrichment.

Labels: `untradeable`, `too_early`, `watch_launch`, `scalp_only`, `candidate_after_retest`, `paper_trade_candidate`

- `scan [--source latest-boosted] [--chain solana] [--limit 10] [--save]`
- `token <chain> <tokenAddress> [--save]`

---

## Prediction Markets

### polymarket
Polymarket event/market discovery, CLOB orderbook, and wallet tracking.

- `markets [--limit 100] [--active true] [--order volume24hr]`
- `events [--limit 100] [--active true]`
- `market <id>` / `event <id>` / `book <clobTokenId>`
- `leaderboard [--category OVERALL] [--period MONTH] [--order-by PNL] [--limit 25]`
- `consensus-study [--query bitcoin] [--match bitcoin,btc] [--market-limit 50]`
- `btc-consensus-study`
- `wallet-profile <wallet>` / `wallet-activity <wallet>` / `wallet-trades <wallet>` / `wallet-positions <wallet>` / `wallet-summary <wallet>`
- `market-positions <conditionId>`
- `scan`

### kalshi
Kalshi prediction market discovery, orderbook, and event data.

- `status`
- `markets [--limit 100] [--status open] [--series KXBTC] [--event <event_ticker>]`
- `market --ticker <market_ticker>`
- `orderbook --ticker <market_ticker> [--depth 50]`
- `trades [--ticker <market_ticker>] [--limit 100]`
- `events [--limit 100] [--status open] [--series <series_ticker>]`
- `event --event <event_ticker>`
- `series [--limit 400] [--category Economics]`

---

## Forecasting

The forecasting tools are **data-source agnostic**. Use `--input <file>` to supply pre-fetched bars from any adapter — Alpaca, CoinGecko, Kraken, etc. Without `--input`, they default to Yahoo Finance.

Input format: a JSON array where each element has at least a `close` field. Chronos and TimesFM use only `close`; Kronos uses `open`, `high`, `low`, `close` with `timestamp` in seconds.

```bash
# Equity — fetch from Alpaca, run all three models
npm run alpaca -- bars LMT --start 2025-06-01 > /tmp/lmt.json
npm run chronos -- forecast LMT --input /tmp/lmt.json
npm run timesfm -- forecast LMT --input /tmp/lmt.json
npm run kronos  -- forecast LMT --input /tmp/lmt.json

# Crypto — fetch from CoinGecko or Kraken
npm run coingecko -- chart bitcoin --days 365 > /tmp/btc.json
npm run chronos -- forecast BTC --input /tmp/btc.json
```

### chronos
Amazon Chronos probabilistic forecasts from candle closes. Requires Python environment setup.

- `setup` / `check` / `example`
- `forecast <symbol> [--range 6mo] [--interval 1d] [--prediction-length 8] [--samples 64] [--local-files-only] [--input <file>]`

### timesfm
Google TimesFM 2.5 forecasts from candle closes. Requires Python environment setup.

- `setup` / `check` / `example`
- `forecast <symbol> [--range 6mo] [--interval 1d] [--prediction-length 8] [--max-context 1024] [--local-files-only] [--input <file>]`

### kronos
Local native forecasts with isolated Python environment under `tmp/`.

- `setup` / `check` / `example`
- `forecast <symbol> [--range 6mo] [--interval 1d] [--lookback 100] [--pred-len 5] [--input <file>]`

---

## Operations

### tradingview
TradingView desktop app via CDP — order management, positions, account. Alpaca is now the primary paper trading surface; TradingView is retained for charting and visualization.

- `account` / `positions` / `orders` / `history`
- `chart` / `indicators`
- `symbol <symbol>` / `timeframe <timeframe>`
- `buy <symbol> <quantity> [market|limit] [limitPrice]`
- `sell <symbol> <quantity> [market|limit] [limitPrice]`
- `close <symbol>` / `cancel <orderId|symbol>`

### regime
Market regime classification from candles and breadth.

- `crypto [--range 1mo] [--interval 1h] [--include-memes] [--save]`
- `symbol <symbol> [--range 1mo] [--interval 1h] [--save]`
