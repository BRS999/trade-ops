# Architecture

Trade Ops is intentionally structured like a future monorepo without paying monorepo cost yet.

## Current Layout

- `types/`
  Shared domain types and tool-manifest contracts. This is the current source of truth for the LLM-facing API.
- `adapters/`
  Venue and data-source integrations such as TradingView, Yahoo, Massive, FRED, SEC EDGAR, CFTC, GeckoTerminal, and DexScreener.
- `journal/`
  File-backed trade records, postmortems, and supporting scripts.
- `watchlists/`
  Universe definitions, active watchlists, and ranking artifacts.
- `tools/`
  LLM-facing or operator-facing entry points. These should call the domain layer instead of reaching into adapters directly.
- `config/`
  Local, file-backed risk rules and taxonomy definitions.
- `data/`
  Runtime artifacts that are safe to keep in-repo when appropriate.

## Future Package Boundaries

If Trade Ops eventually outgrows a single-package repo, the clean split is likely:

- `packages/domain`
- `packages/adapters-tradingview`
- `packages/adapters-brokers`
- `packages/journal`
- `packages/tools`

The current folder structure is meant to make that migration straightforward.

## Current Rule

- Keep one root package.
- Prefer simple file paths and module boundaries over package infrastructure.
- Introduce a monorepo tool only when there are multiple real packages or deployables to coordinate.
