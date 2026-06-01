# Trade-Ops

<p align="center">
  <em>TradingView is the cockpit. Trade-Ops is everything behind it.</em><br>
  Most traders manage risk in their head and journal in a spreadsheet.<br>
  <strong>I built the ops layer I actually needed.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white" alt="Claude Code">
  <img src="https://img.shields.io/badge/Codex-111827?style=flat&logo=openai&logoColor=white" alt="Codex">
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/TradingView-2962FF?style=flat&logo=tradingview&logoColor=white" alt="TradingView">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT">
</p>

<p align="center">
  <a href="https://brs999.github.io/trade-ops/">
    <img src="https://img.shields.io/badge/Website-GitHub%20Pages-222?style=flat&logo=githubpages&logoColor=white" alt="Website">
  </a>
</p>

---

## What Is This

Trade-Ops is a retail trading operating system built around TradingView as the primary charting surface and Alpaca as the primary execution surface. It does not try to replace either — it extends them with durable memory, structured workflows, and a data adapter layer that an AI agent can actually use.

- **LLM knowledge base** — a wiki compiled and maintained by the agent from raw journal data. Symbols, setups, edges, mistakes, and market context — all synthesized and queryable
- **Multi-source market data** — equities, crypto, macro, on-chain, DEX, sentiment, filings
- **Source-agnostic chart state** — normalized candle input becomes indicators, distances, returns, volatility, volume, and flags for agent analysis
- **Structured journal** — every trade has a thesis, risk box, and review trail in JSON + Markdown
- **Signal candidate layer** — observations, signals, and ranked candidates bridge raw data to research memos
- **Trading universe** — broad cross-asset menu for scans, candidates, and research
- **Human-in-the-loop** — AI evaluates and enriches, you decide and execute
- **Paper before live** — all execution workflows start paper-first with explicit confirmation

> **This is not an auto-trader.** Trade-Ops is a discipline layer — it helps you think more clearly, track honestly, and review systematically. The AI never places a live order. You always have the final call.

## Repo Layout Philosophy

Trade-Ops uses a split model:

- **shareable project assets** live in Git
- **local working state** lives on your machine

The repository should teach the structure without bundling personal trade history or live operating state.

### What Gets Tracked

- adapter code
- CLI tools
- schemas and templates
- signal and research examples
- example journal entries
- symbol and setup wiki examples
- architecture and usage docs

### What Stays Local

- active trades
- closed personal journal records
- broker/account snapshots
- generated signal candidates
- generated research memos and reports
- live market context snapshots
- regime notes tied to your current research process
- scratch runtime files under `tmp/`

### Rule of Thumb

If a file is reusable as an example, interface, template, or adapter, it belongs in Git.

If a file reflects your current account state, active research, or personal trading history, it should stay local.

## TradingView Requirement

Trade Ops is built around the TradingView desktop app for chart state and paper-trading control.

- The current TradingView adapter and CLI are designed for the desktop app, not the browser-only web app.
- If you want to use `npm run tv -- ...` commands for chart inspection or paper execution, you should have the TradingView desktop app installed and running.
- If the TradingView CDP bridge drops, the adapter attempts one automatic recovery by relaunching the desktop app with the debug port enabled. You can also run `npm run tv -- recover` manually, then verify with `npm run tv -- status`.
- Paper-trading workflows are the supported execution mode in V1.

## System Requirements

Core Trade-Ops usage is intentionally lightweight.

### Required

- `Node.js` 20+ with `npm`
- macOS, Linux, or another environment that can run Node.js ESM scripts

### Required for TradingView workflows

- TradingView desktop app installed and running

### Optional API keys

- `ALPACA_API_KEY` + `ALPACA_API_SECRET` — Alpaca paper trading and Alpaca market data
- `MASSIVE_API_KEY`
- `FRED_API_KEY`
- `FMP_API_KEY`
- `COINGECKO_API_KEY` — optional; public tier works without a key but is rate-limited (~5 req/min)
- `EIA_API_KEY`
- `FINNHUB_API_KEY`
- `ALPHAVANTAGE_API_KEY` — optional; free tier works without a key but is limited to 25 req/day
- `BEA_API_KEY`
- `ETHERSCAN_API_KEY` — optional; free tier works without a key (5 req/s, 100k/day)

You can still use a meaningful subset of the repo without any API keys through Yahoo, SEC EDGAR, SecuritiesDB, GDELT, CFTC, Binance Futures public data, Hyperliquid, Deribit, Coinbase/Kraken public market data, CoinGecko public tier, GeckoTerminal, DexScreener, DeFiLlama, Kalshi/Polymarket public market data, BLS, Treasury FiscalData, Fear & Greed, FINRA, and AlphaVantage/BEA/Etherscan free tiers.

When using Alpaca paper trading, treat Alpaca positions and open orders as the source of truth for active account state. Local journal entries should be synced to Alpaca rather than trusted blindly.

### Optional: Forecasting Models

Local forecasting models are experiments, not core dependencies of Trade-Ops.

If you want to run Amazon Chronos, TimesFM, or Kronos locally with Apple Silicon acceleration:

- `Python` 3.11 is required for local forecasting
- `uv`
- Apple Silicon Mac with PyTorch `mps` support recommended

Amazon Chronos is exposed through `npm run chronos -- ...`. TimesFM is exposed through `npm run timesfm -- ...`. NeoQuasar Kronos is exposed through `npm run kronos -- ...`.

Chronos, TimesFM, and Kronos each manage their own local Python environment under `tmp/`, which is intentionally ignored by Git. First setup and first model use require network access for Python packages, source/model downloads, and Hugging Face caches.

```bash
# Amazon Chronos
npm run chronos -- setup
npm run chronos -- check
npm run chronos -- example
npm run chronos -- forecast BTC-USD --range 5d --interval 1h --prediction-length 12

# TimesFM
npm run timesfm -- setup
npm run timesfm -- check
npm run timesfm -- example
npm run timesfm -- forecast BTC-USD --range 5d --interval 1h --prediction-length 12

# NeoQuasar Kronos
npm run kronos -- setup
npm run kronos -- check
npm run kronos -- example
npm run kronos -- forecast BTC-USD --range 5d --interval 1h
```

Use `--local-files-only` only after the selected Chronos or TimesFM model has already been downloaded locally.

If you do not care about local forecasting models, you do not need Python or any of the forecasting setup commands.

---

## Data Stack

| Adapter | Source | What It Provides | Key |
|---|---|---|---|
| **TradingView** | TradingView desktop app | Chart state, indicators, paper positions | — |
| **Alpaca** | alpaca.markets | Paper positions, orders, fills, equity candles, crypto candles | `ALPACA_API_KEY` + `ALPACA_API_SECRET` |
| **Yahoo Finance** | Yahoo | Live quotes, bars, multi-asset (equities, crypto, futures) | — |
| **Massive** | massive.com | Tick data, earnings, fundamentals | `MASSIVE_API_KEY` |
| **SEC EDGAR** | sec.gov | Filings, ownership, insider activity | — |
| **FRED** | stlouisfed.org | Macro snapshot (yields, CPI, VIX, Fed Funds) | `FRED_API_KEY` |
| **FMP** | financialmodelingprep.com | Analyst consensus, price targets, earnings calendar | `FMP_API_KEY` |
| **CFTC** | publicreporting.cftc.gov | Commitment of Traders positioning context | — |
| **Binance Futures** | binance.com | USD-M funding, open interest, long/short ratio, taker flow | — |
| **Hyperliquid** | hyperliquid.xyz | Perpetual mark price, funding, open interest, 24h volume | — |
| **Deribit** | deribit.com | BTC/ETH options/futures books, IV, open interest, volume | — |
| **Coinbase** | coinbase.com | US-accessible public spot products, order books, candles | — |
| **Kraken** | kraken.com | Public spot ticker, order books, OHLC | — |
| **CoinGecko** | coingecko.com | Aggregated CEX+DEX prices, global market, trending, sovereign/corporate BTC treasury | optional `COINGECKO_API_KEY` |
| **GeckoTerminal** | geckoterminal.com | On-chain pools, DEX OHLCV, Solana trending | — |
| **DexScreener** | dexscreener.com | Cross-chain pair search, liquidity, boosted tokens | — |
| **DeFiLlama** | defillama.com | Chain/protocol TVL, stablecoin supply, DEX volume, fees, yields | — |
| **RugCheck** | rugcheck.xyz | Solana token risk reports, authority checks, LP locks, holder concentration | optional `RUGCHECK_API_KEY` / `RUGCHECK_JWT` |
| **Kalshi** | kalshi.com | Prediction-market discovery, market details, orderbooks, trades, events, series | — |
| **Polymarket** | polymarket.com | Prediction-market discovery, active market flow, CLOB books, public wallet activity/positions/leaderboards | — |
| **BLS** | bls.gov | Official labor, CPI, payroll, wages time series | optional `BLS_API_KEY` |
| **Treasury FiscalData** | fiscaldata.treasury.gov | Debt, Treasury statement, securities sales/issuance data | — |
| **Fear & Greed** | alternative.me | Crypto sentiment index (0–100) | — |
| **EIA** | eia.gov | WTI/Brent, crude inventories, nat gas storage, SPR, US production | `EIA_API_KEY` |
| **Finnhub** | finnhub.io | Equity quotes, insider/congressional trading, earnings, news sentiment | `FINNHUB_API_KEY` |
| **SecuritiesDB** | securitiesdb.com | Form 4 insider transactions, 13F institutional flow | — |
| **GDELT** | gdeltproject.org | Global geopolitical news search, coverage volume/tone timelines, 65-language monitoring | — |
| **AlphaVantage** | alphavantage.co | News sentiment, market movers (gainers/losers), earnings calendar, commodities, economic indicators | `ALPHAVANTAGE_API_KEY` |
| **BEA** | bea.gov | GDP and components, personal consumption, government spending, investment, international transactions, regional/state economic data | `BEA_API_KEY` |
| **Etherscan** | etherscan.io | Ethereum on-chain data — whale wallet tracking, exchange flows, gas prices, token transfers, DeFi positions | `ETHERSCAN_API_KEY` |
| **FINRA** | finra.org | Daily short sale volume per symbol — short pressure and exhaustion signals | — |

---

## CLI Tools

```bash
npm run alpaca -- positions
npm run alpaca -- orders --status open --limit 50
npm run alpaca -- bars GEV --timeframe 1Day --limit 260
npm run alpaca -- bars BTCUSD --timeframe 1Day --limit 260

npm run chart-state -- --input candles.json --symbol GEV --timeframe 1Day
node tools/alpaca.mjs bars GEV | npm run chart-state -- --symbol GEV --timeframe 1Day

npm run yahoo  -- quote AAPL
npm run yahoo  -- bars SOL-USD --interval 1d --range 1mo

npm run deribit -- options-snapshot BTC,ETH
npm run coinbase -- snapshot BTC-USD,ETH-USD,SOL-USD
npm run kraken -- snapshot XBTUSD,ETHUSD,SOLUSD
npm run bls -- macro
npm run fiscaldata -- snapshot

npm run fred   -- macro
npm run fred   -- latest DGS10

npm run fmp    -- summary AAPL
npm run fmp    -- earnings --from 2026-04-01 --to 2026-04-30

npm run sec    -- filings AAPL
npm run sec    -- facts AAPL
npm run sec    -- facts-concept TSLA Revenues --limit 3

npm run cftc   -- snapshot gold crude spx ndx eurusd bitcoin

npm run eia    -- snapshot
npm run eia    -- crude-stocks --limit 8

npm run coingecko -- snapshot
npm run coingecko -- price bitcoin,solana --change
npm run coingecko -- sovereign-btc
npm run coingecko -- treasury strategy

npm run gecko  -- solana
npm run gecko  -- trending-network solana 1h
npm run gecko  -- ohlcv solana <poolAddress> hour 1 100
npm run gecko  -- token-price solana <tokenAddress>

npm run binance-futures -- snapshot BTCUSDT,ETHUSDT,SOLUSDT
npm run binance-futures -- funding BTCUSDT --limit 24

npm run hyperliquid -- snapshot BTC,ETH,SOL

npm run dex    -- search "ETH/USDC" 10
npm run dex    -- pair solana <pairAddress>
npm run dex    -- top-boosted 10

npm run rugcheck -- safety <mint>
npm run rugcheck -- summary <mint>
npm run rugcheck -- report <mint>

npm run kalshi -- status
npm run kalshi -- markets --series KXBTC --status open --limit 10
npm run kalshi -- market --ticker <marketTicker>
npm run kalshi -- orderbook --ticker <marketTicker> --depth 50
npm run kalshi -- trades --ticker <marketTicker> --limit 100
npm run kalshi -- events --limit 20
npm run kalshi -- series --category Economics --limit 20

npm run polymarket -- scan --limit 100
npm run polymarket -- market <id>
npm run polymarket -- wallet-summary <wallet> --days 90

npm run defillama -- snapshot --limit 10

npm run fng    -- current
npm run fng    -- history 30

npm run finnhub -- snapshot PLTR
npm run finnhub -- insider-transactions PLTR --from 2026-01-01

npm run securitiesdb -- snapshot PLTR
npm run securitiesdb -- institutional AAPL

npm run gdelt -- snapshot "tariff" --timespan 7d
npm run gdelt -- articles --theme sanctions --max-records 20
npm run gdelt -- volume "ukraine" --timespan 14d

npm run alphavantage -- gainers-losers
npm run alphavantage -- news --tickers AAPL,MSFT
npm run alphavantage -- earnings-calendar
npm run alphavantage -- commodity wheat
npm run alphavantage -- economic GDP

npm run bea -- snapshot
npm run bea -- gdp
npm run bea -- pce
npm run bea -- state-gdp --fips 06000

npm run etherscan -- snapshot <address>
npm run etherscan -- gas
npm run etherscan -- price

npm run finra -- symbol AAPL
npm run finra -- multi AAPL,MSFT,TSLA
npm run finra -- top --limit 20

npm run new-token -- scan --source latest-boosted --chain solana --limit 10

npm run massive -- snapshot AAPL
npm run massive -- financials AAPL --timeframe quarterly --limit 4
npm run tv      -- status
npm run tv      -- recover
npm run tv      -- chart
npm run tv      -- account
```

---

## Knowledge Base (Wiki)

The wiki is an LLM-maintained knowledge base compiled from raw journal records and adapter data. You never edit it manually — the agent writes and updates it as trades are reviewed and snapshots are run.

```
wiki/
├── README.md         # Public rules for local compiled memory
├── examples/         # Scrubbed examples only
└── market/
    └── README.md     # Public rules for local market context
```

The working wiki is local compiled trading memory. The agent may read and update local symbol, setup, mistake, edge, and market-context notes during trading work, but personal memory files should not be committed. Scrubbed examples belong under `wiki/examples/`.

### The Two-Layer Model

| Layer | What it is | Who writes it |
|---|---|---|
| `journal/` | What happened — immutable trade records | You (via agent) |
| `wiki/` | What you know — synthesized understanding | Agent only |

The journal answers *"what happened?"* The wiki answers *"what do I know?"*

### Public vs Local Wiki

| Path | Purpose | Git Behavior |
|---|---|---|
| `wiki/README.md` | Public wiki discipline | tracked |
| `wiki/examples/` | Scrubbed example memory files | tracked |
| `wiki/market/README.md` | Public market-context discipline | tracked |
| `wiki/symbols/` | Personal symbol memory | local |
| `wiki/setups/` | Personal setup memory and stats | local |
| `wiki/edges.md` | Personal cross-trade edge notes | local |
| `wiki/mistakes.md` | Personal recurring mistake notes | local |
| `wiki/market/context.md` | Live macro snapshot and regime notes | local |

---

## Signal Engine

The signal engine is the research layer between raw adapters and trade planning:

```text
raw tools -> exploration -> candidates -> memo -> trade plan -> journal/review
```

It is designed to answer: *"Where should I focus my attention today, and why?"*

The first committed layer is schema-first:

```
signals/
├── schema/          # Observation, signal, score, and candidate schemas
├── examples/        # Scrubbed example candidates
└── candidates/      # Local generated candidate records

research/
├── schema/          # Investment memo and skeptic review schemas
├── examples/        # Scrubbed memo examples
└── memos/           # Local generated research packets

reports/
├── daily-board/     # Local generated daily opportunity boards
├── weekly-review/   # Local generated weekly reviews
└── attribution/     # Local generated attribution reports
```

Signal candidates are not trades. They are ranked research objects that require fresh data, evidence, counter-evidence, invalidation, risk checks, and skeptic review before promotion to a trade plan.

There is intentionally no bundled all-in-one market survey. Broad scanners can become hidden decision engines and bias the agent toward a canned conclusion. Use the raw tools directly, combine sources deliberately, and let the research question determine which APIs to call.

Examples of exploratory tool calls:

```bash
npm run yahoo -- quotes SPY,QQQ,HYG,TLT,VXX,NVDA,AMD,HOOD
npm run fred -- macro
npm run cftc -- snapshot bitcoin,gold,ndx
npm run coingecko -- snapshot
npm run hyperliquid -- snapshot BTC,ETH,SOL
npm run deribit -- options-snapshot BTC,ETH
npm run eia -- snapshot
npm run polymarket -- scan --limit 100
npm run polymarket -- leaderboard --category CRYPTO --period MONTH --limit 25
npm run polymarket -- btc-consensus-study --market-limit 50 --horizons 168,24,1,0
npm run polymarket -- wallet-summary <wallet> --days 90
npm run defillama -- snapshot --limit 10
npm run new-token -- scan --source latest-boosted --chain solana --limit 10
```

The agent should explore across possible expressions: longs, shorts, hedges, event markets, futures/options context, high-beta paper tests, and concrete rejections. A `no trade` conclusion should be a research conclusion, not the output of a generic scanner.

See `docs/SIGNAL_ENGINE.md` for the object model and workflow.

### Public vs Local Signal State

| Path | Purpose | Git Behavior |
|---|---|---|
| `signals/schema/` | Signal object contracts | tracked |
| `signals/examples/` | Public example candidates | tracked |
| `signals/candidates/` | Generated candidate records | local |
| `research/schema/` | Memo and skeptic review contracts | tracked |
| `research/examples/` | Public memo examples | tracked |
| `research/memos/` | Generated research packets | local |
| `reports/` | Generated boards, reviews, and attribution reports | local |

---

## Journal

Every trade is stored as a paired JSON + Markdown record.

```
journal/
├── open/            # Active positions
├── closed/          # Completed trades
├── schema/          # Trade schema + asset-class extensions
│   ├── trade.schema.json
│   ├── equity-extension.json
│   ├── crypto-extension.json
│   └── prediction-extension.json
├── templates/       # Blank trade template
└── examples/        # Sample entries (NVDA equity, SOL crypto, TARIFF prediction)
```

Every trade must define:

- symbol, asset class, side, setup type
- entry, stop, target, reward/risk
- thesis and invalidation
- outcome, mistakes, lessons

### Public vs Local Journal

| Path | Purpose | Git Behavior |
|---|---|---|
| `journal/schema/` | Record schema and asset extensions | tracked |
| `journal/templates/` | Blank trade templates | tracked |
| `journal/examples/` | Public example trades | tracked |
| `journal/open/` | Your active trades | local |
| `journal/closed/` | Your closed personal trades | local |

### Trade Lifecycle

```
idea → watchlist → planned → ready → ordered → open → closed → reviewed
                                                                  ↓
                                                          cancelled / rejected
```

---

## Watchlist

```
watchlists/
└── universe.json   # Full tracked universe (equities, crypto, futures, predictions)
```

The universe is the scan menu, not the active state. It defines symbols, asset classes, and adapter mappings (`yahoo_symbol`, `coingecko_id`, GeckoTerminal addresses, etc.) so tools can resolve instruments across data sources.

Current active state comes from TradingView positions/orders and repo journal records under `journal/open/`.

### Watchlist Note

`watchlists/` is committed because it defines the system's working universe. It should not be used as a shadow account state file.

---

## Asset Classes

| Class | Notes |
|---|---|
| **Equities** | US stocks — earnings-aware, SEC filings, analyst consensus |
| **Crypto** | BTC, ETH, SOL — DEX + CEX price verification, on-chain pool data |
| **Futures** | Micro E-mini S&P (MES), Micro Nasdaq (MNQ), Gold (GC) — macro context |
| **Prediction Markets** | Kalshi contracts — yes/no side, contract price, resolution date |

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/brs999/trade-ops.git
cd trade-ops

# 2. Add API keys
cp .env.example .env
# Edit .env: MASSIVE_API_KEY, FRED_API_KEY, FMP_API_KEY

# 3. Test the stack
npm run tv      -- account         # Requires the TradingView desktop app
npm run fng        -- current          # Fear & Greed — no key needed
npm run coingecko  -- snapshot         # Global crypto market — no key needed (rate-limited)
npm run gecko      -- solana           # SOL on-chain snapshot — no key needed
npm run yahoo      -- quote AAPL       # Live quote — no key needed
npm run fred   -- macro            # Macro snapshot — needs FRED key
npm run fmp    -- summary AAPL     # Analyst consensus — needs FMP key

# 4. Open with your AI agent
# codex / claude — AGENTS.md and the adapters are the context layer
```

Most runtime CLIs use only Node.js built-ins. Run `npm install` only if you want local dev dependencies such as TypeScript for `npm run check`.

## Project Structure

```
trade-ops/
├── AGENTS.md            # tracked: Codex-first repo instructions and operating rules
├── CLAUDE.md            # tracked: Claude-oriented session guide kept for compatibility
├── adapters/            # tracked: source adapters by provider
├── config/              # tracked: risk rules and taxonomy
├── docs/                # tracked: architecture and supporting docs
├── journal/
│   ├── schema/          # tracked: canonical trade schemas
│   ├── templates/       # tracked: blank trade templates
│   ├── examples/        # tracked: sample trades
│   ├── open/            # local: active personal trades
│   └── closed/          # local: completed personal trades
├── signals/
│   ├── schema/          # tracked: observation, signal, score, candidate schemas
│   ├── examples/        # tracked: scrubbed signal candidate examples
│   └── candidates/      # local: generated candidate records
├── research/
│   ├── schema/          # tracked: memo and skeptic review schemas
│   ├── examples/        # tracked: scrubbed memo examples
│   └── memos/           # local: generated research packets
├── reports/             # local: generated boards, reviews, attribution reports
├── tools/               # tracked: CLI entry points (`npm run *`)
├── types/               # tracked: TypeScript domain types and tool manifest
├── watchlists/          # tracked: universe definitions and scan inputs
├── wiki/
│   ├── README.md        # tracked: local memory rules
│   ├── examples/        # tracked: scrubbed examples
│   └── market/          # README tracked; context files local
├── tmp/                 # local: scratch files and experiments
└── .env.example         # tracked: environment variable template
```

### Folder Rules

- Prefer adding reusable structure under `schema/`, `templates/`, `examples/`, `docs/`, `adapters/`, or `tools/`
- Prefer keeping time-sensitive operating state under `journal/open/`, `journal/closed/`, `signals/candidates/`, `research/memos/`, `reports/`, `wiki/market/`, or `tmp/`
- Do not commit personal trade history or live market notes


---

## Risk Config

Default risk parameters live in `config/risk.json`:

- max simultaneous positions
- max risk per trade (% of capital)
- max portfolio heat
- daily loss limit

All execution workflows read these before sizing or placing any order.

---

## Tech Stack

<img src="https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white" alt="Claude Code">
<img src="https://img.shields.io/badge/Node.js_ESM-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js ESM">
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript">
<img src="https://img.shields.io/badge/TradingView-2962FF?style=flat&logo=tradingview&logoColor=white" alt="TradingView">

- **Agent runtime**: Codex and Claude Code — `AGENTS.md` and `CLAUDE.md` provide repo-specific guidance
- **Repo instructions**: `AGENTS.md` is the primary Codex instruction file
- **Language**: Node.js ESM (`.mjs`) — no build step, no bundler
- **Types**: TypeScript for domain types and tool manifest (`tsc --noEmit` only)
- **Storage**: File-based JSON + Markdown — flat files are the canonical source of truth in V1
- **Knowledge**: LLM-maintained wiki compiled from journal records and adapter snapshots
- **Data**: 24+ source adapters covering equities, crypto, macro, energy, positioning, on-chain, DEX, prediction markets, sentiment, filings, and short volume

---

## Principles

- TradingView remains the primary chart and discretionary decision surface
- The system must keep durable state outside chat threads
- Paper trading comes before live trading
- Every trade must have a thesis, risk box, and review trail
- File-based storage is the default source of truth in V1
- Any future database layer is optional and derived, not canonical

---

## License

MIT

## Disclaimer

- Trade Ops is research and workflow software, not financial advice.
- Trading and investing involve substantial risk, including loss of capital.
- Always do your own research, validate data independently, and use paper trading before risking real money.
- You are responsible for your own decisions, orders, and risk management.
