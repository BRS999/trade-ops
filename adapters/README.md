# Adapters

Adapters connect Trade Ops to external data sources. Each adapter exposes a stable internal interface and is consumed by the corresponding tool in `tools/`.

| Adapter | Key | What it provides |
|---|---|---|
| `alpaca` | required | Paper and live trading: orders, positions, account, brackets, OCO exits, portfolio history. Also equity market data (bars, quotes, snapshots) via `data.alpaca.markets` — same keys, primary fallback when Yahoo is unavailable |
| `alphavantage` | required | News sentiment, commodity prices (wheat/corn/copper/etc.), market movers, earnings calendar |
| `bea` | required | GDP, PCE, GDP-by-industry, state GDP/income, international accounts |
| `binance-futures` | none | Crypto perpetuals: funding rates, open interest, long/short ratio, taker flow |
| `bls` | none | Official CPI, payrolls, unemployment time series |
| `cftc` | none | Commitments of Traders (COT) — futures positioning for rates, FX, indices, commodities |
| `coinbase` | none | US-accessible spot venue: order book, candles, product snapshot |
| `coingecko` | none | Aggregated crypto prices, market cap, global stats, trending, treasury holdings |
| `defillama` | none | Chain TVL, protocol rotation, stablecoin supply, DEX volume/fees |
| `deribit` | none | BTC/ETH options surface, vol index, futures/options OI and volume |
| `dexscreener` | none | Cross-chain pair search, liquidity/volume screening, boosted/trending tokens |
| `eia` | required | WTI/Brent prices, weekly crude inventories, nat gas storage, US production |
| `etherscan` | required | Ethereum on-chain: wallet balances, token holdings, txs, gas oracle, ETH price |
| `fear-and-greed` | none | Crypto F&G (alternative.me) + equity F&G with 7 sub-indicators including put/call (CNN) |
| `finnhub` | required | Insider flow (Form 4), congressional trades, earnings, news sentiment, analyst consensus |
| `fiscaldata` | none | Treasury auctions, US debt, Daily Treasury Statement |
| `fmp` | required | Analyst price targets, forward EPS/revenue estimates, earnings calendar |
| `fred` | required | Treasury yields, spreads, Fed funds rate, CPI, FRED release calendar |
| `gdelt` | none | Geopolitical news: keyword/theme/country search, tone and volume timelines |
| `gecko-terminal` | none | On-chain DEX data: Solana pools, trending pools, OHLCV, token metadata |
| `hyperliquid` | none | US-accessible crypto perpetuals: funding, OI, mark price, 24h volume |
| `kalshi` | none | Prediction market discovery, orderbook, and event data |
| `kraken` | none | Spot venue: ticker, order book, OHLC, snapshot |
| `massive` | none | Historical OHLCV bars, ticker fundamentals, past financials (Polygon-backed) |
| `polymarket` | none | Prediction market discovery, CLOB orderbook, wallet positions and activity |
| `rugcheck` | none | Solana token safety reports: risk score, holder concentration, liquidity locks |
| `sec-edgar` | none | SEC filings (10-K, 10-Q, 8-K), company facts, CIK resolution |
| `securitiesdb` | none | Form 4 insider transactions, 13F smart-money flow (Citadel, RenTech, etc.) |
| `tradingview` | none | TradingView desktop app via CDP: positions, orders, account, order management |
| `yahoo` | none | Live quotes, crypto prices, OHLCV bars, options chains with IV and greeks |
| `finra` | none | Daily short sale volume per symbol — short pressure proxy, not open short interest |

Each adapter should expose a stable internal interface even if the underlying implementation changes.
