# Watchlists

This module owns:

- trading universe
- research universe structure
- symbol mappings for adapters
- broad scan inputs

## Tracking Model

- `universe.json` stays tracked in git as the shared investment universe.
- There is no separate file source of truth for live state.
- Active state lives in TradingView positions/orders and repo journal records under `journal/open/`.

Use the universe as a broad menu of potential trading instruments. Use TradingView and the journal to determine what is actually active right now.
