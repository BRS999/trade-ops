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

---

## What Is This

Trade-Ops is a retail trading operating system built around TradingView as the primary charting and discretionary cockpit. It does not try to replace TradingView — it extends it with durable memory, structured workflows, and a data adapter layer that an AI agent can actually use.

- **LLM knowledge base** — a wiki compiled and maintained by the agent from raw journal data. Symbols, setups, edges, mistakes, and market context — all synthesized and queryable
- **Multi-source market data** — equities, crypto, macro, on-chain, DEX, sentiment, filings
- **Structured journal** — every trade has a thesis, risk box, and review trail in JSON + Markdown
- **Tiered watchlist** — universe + active watchlist with setup plans and invalidation levels
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
- example journal entries
- symbol and setup wiki examples
- architecture and usage docs

### What Stays Local

- active trades
- closed personal journal records
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
- Paper-trading workflows are the supported execution mode in V1.

## System Requirements

Core Trade-Ops usage is intentionally lightweight.

### Required

- `Node.js` 20+ with `npm`
- macOS, Linux, or another environment that can run Node.js ESM scripts

### Required for TradingView workflows

- TradingView desktop app installed and running

### Optional API keys

- `MASSIVE_API_KEY`
- `FRED_API_KEY`
- `FMP_API_KEY`

You can still use a meaningful subset of the repo without any API keys through Yahoo, SEC EDGAR, CFTC, GeckoTerminal, DexScreener, and Fear & Greed.

### Optional: Kronos

Kronos is an experiment, not a core dependency of Trade-Ops.

If you want to run Kronos locally with Apple Silicon acceleration:

- `Python` 3.11
- `uv`
- Apple Silicon Mac with PyTorch `mps` support recommended

If you do not care about Kronos, you do not need Python, Docker, or any of the Kronos setup commands.

---

## Data Stack

| Adapter | Source | What It Provides | Key |
|---|---|---|---|
| **TradingView** | TradingView desktop app | Chart state, indicators, paper positions | — |
| **Yahoo Finance** | Yahoo | Live quotes, bars, multi-asset (equities, crypto, futures) | — |
| **Massive** | massive.com | Tick data, earnings, fundamentals | `MASSIVE_API_KEY` |
| **SEC EDGAR** | sec.gov | Filings, ownership, insider activity | — |
| **FRED** | stlouisfed.org | Macro snapshot (yields, CPI, VIX, Fed Funds) | `FRED_API_KEY` |
| **FMP** | financialmodelingprep.com | Analyst consensus, price targets, earnings calendar | `FMP_API_KEY` |
| **CFTC** | publicreporting.cftc.gov | Commitment of Traders positioning context | — |
| **GeckoTerminal** | geckoterminal.com | On-chain pools, DEX OHLCV, Solana trending | — |
| **DexScreener** | dexscreener.com | Cross-chain pair search, liquidity, boosted tokens | — |
| **Fear & Greed** | alternative.me | Crypto sentiment index (0–100) | — |

---

## CLI Tools

```bash
npm run yahoo  -- quote AAPL
npm run yahoo  -- bars SOL-USD --interval 1d --range 1mo

npm run fred   -- macro
npm run fred   -- latest DGS10

npm run fmp    -- summary AAPL
npm run fmp    -- earnings --from 2026-04-01 --to 2026-04-30

npm run sec    -- filings AAPL
npm run sec    -- facts AAPL
npm run sec    -- facts-concept TSLA Revenues --limit 3

npm run cftc   -- snapshot gold crude spx ndx eurusd bitcoin

npm run gecko  -- solana
npm run gecko  -- trending-network solana 1h
npm run gecko  -- ohlcv solana <poolAddress> hour 1 100
npm run gecko  -- token-price solana <tokenAddress>

npm run dex    -- search "ETH/USDC" 10
npm run dex    -- pair solana <pairAddress>
npm run dex    -- top-boosted 10

npm run fng    -- current
npm run fng    -- history 30

npm run massive -- quote AAPL
npm run massive -- financials AAPL --timeframe quarterly --limit 4
npm run tv      -- chart
npm run tv      -- account
```

---

## Knowledge Base (Wiki)

The wiki is an LLM-maintained knowledge base compiled from raw journal records and adapter data. You never edit it manually — the agent writes and updates it as trades are reviewed and snapshots are run.

```
wiki/
├── INDEX.md          # Map of everything — first thing the agent reads each session
├── symbols/          # Per-symbol history, edge notes, key levels
│   ├── NVDA.md
│   └── SOL.md
├── setups/           # Setup type definitions, conditions, stats, examples
│   ├── breakout.md
│   └── pullback.md
├── market/           # Local-only live market context and regime notes
├── mistakes.md       # Recurring mistake patterns with tally
└── edges.md          # Validated setups with sample stats
```

The agent reads the wiki before working on any trade. After every trade review it updates the relevant symbol, setup, mistakes, and edges files. After running adapter snapshots it updates the local `wiki/market/` files. Queries always add up — explorations get filed back in.

### The Two-Layer Model

| Layer | What it is | Who writes it |
|---|---|---|
| `journal/` | What happened — immutable trade records | You (via agent) |
| `wiki/` | What you know — synthesized understanding | Agent only |

The journal answers *"what happened?"* The wiki answers *"what do I know?"*

### Public vs Local Wiki

| Path | Purpose | Git Behavior |
|---|---|---|
| `wiki/symbols/` | Reusable symbol notes and examples | tracked |
| `wiki/setups/` | Reusable setup definitions and examples | tracked |
| `wiki/edges.md` | Cross-trade edge notes | tracked |
| `wiki/mistakes.md` | Recurring mistake patterns | tracked |
| `wiki/market/` | Live macro snapshot, regime notes, current board context | local |

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
├── universe.json   # Full tracked universe (equities, crypto, futures, predictions)
└── active.json     # Current focus — tiered by conviction and setup quality
```

Active watchlist entries include tier (1–3), status, setup type, entry/stop/target plan, invalidation level, and earnings date. Symbol mappings (`yahoo_symbol`, `coingecko_id`) let a single entry resolve across adapters.

The current board lives in `watchlists/active.json` and should be treated as the source of truth instead of hardcoded README examples.

### Watchlist Note

`watchlists/` is currently committed because it defines the system's working universe and examples of board structure.

If you want a fully personal operating board, clone the structure and keep your day-to-day watchlist in a separate local file or future overlay layer rather than committing every board change.

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
npm run fng    -- current          # Fear & Greed — no key needed
npm run gecko  -- solana           # SOL snapshot — no key needed
npm run yahoo  -- quote AAPL       # Live quote — no key needed
npm run fred   -- macro            # Macro snapshot — needs FRED key
npm run fmp    -- summary AAPL     # Analyst consensus — needs FMP key

# 4. Open with your AI agent
# codex / claude — AGENTS.md and the adapters are the context layer
```

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
├── tools/               # tracked: CLI entry points (`npm run *`)
├── types/               # tracked: TypeScript domain types and tool manifest
├── watchlists/          # tracked: universe and current board structure
├── wiki/
│   ├── INDEX.md         # tracked: map of the knowledge base
│   ├── symbols/         # tracked: reusable symbol notes
│   ├── setups/          # tracked: reusable setup notes
│   ├── edges.md         # tracked: edge summaries
│   ├── mistakes.md      # tracked: recurring mistakes
│   └── market/          # local: live market context and regime notes
├── tmp/                 # local: scratch files and experiments
├── compose.yaml         # tracked: optional local services
└── .env.example         # tracked: environment variable template
```

### Folder Rules

- Prefer adding reusable structure under `schema/`, `templates/`, `examples/`, `docs/`, `adapters/`, or `tools/`
- Prefer keeping time-sensitive operating state under `journal/open/`, `journal/closed/`, `wiki/market/`, or `tmp/`
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
- **Data**: 10 adapters covering equities, crypto, macro, positioning, on-chain, DEX, sentiment, and filings

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
