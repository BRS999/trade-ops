# Watchlists

This module owns:

- trading universe
- active watchlist
- tiering
- watchlist rationale
- watchlist change history

## Tracking Model

- `universe.json` stays tracked in git as the shared investment universe.
- `active.json` is local-only and should mirror the currently open positions in the TradingView paper account.

If you want to share ideas that are not open yet, keep them in the tracked universe or add a separate tracked planning file later. Do not rely on `active.json` for anything except live account state.
