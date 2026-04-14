# Trade-Ops

You are operating a retail trading system for Benjamin Spencer.
TradingView is the primary charting surface. This repo is everything behind it.

---

## How to Orient

Start every session by reading:
1. **Open positions** (below) — know what's live before anything else
2. **`wiki/INDEX.md`** — map of all compiled knowledge
3. **`wiki/market/context.md`** — current macro and watchlist state, if present locally

For any symbol you're about to work with, read its wiki file first:
- `wiki/symbols/<SYMBOL>.md` — trade history, what works, what to watch out for

---

## Open Positions

*None.*

*Update this table whenever a position opens or closes.*

---

---

## Key Rules

- Paper before live — never place a live order without explicit confirmation
- Every trade needs: thesis, entry, stop, target before opening
- Stop = plan stop. Do not widen after entry.
- Max risk per trade: see `config/risk.json`
- Check `wiki/mistakes.md` before sizing — know the recurring patterns

---

## Repo Layout

```
journal/open/        ← active trade records (JSON + MD) — raw source of truth
journal/closed/      ← closed and reviewed trades — raw source of truth
wiki/                ← LLM-compiled knowledge base (do not edit manually)
  INDEX.md           ← start here
  symbols/           ← per-symbol history and edge notes
  setups/            ← setup type definitions and stats
  market/            ← macro context and regime notes
  mistakes.md        ← recurring mistake patterns
  edges.md           ← validated edges with stats
adapters/            ← data source clients
tools/               ← CLI entry points (npm run *)
watchlists/          ← universe.json, active.json
config/              ← risk.json, taxonomy.json
```

---

## Data Tools

```bash
npm run yahoo  -- quote <symbol>        # Live price
npm run fred   -- macro                 # Macro snapshot
npm run fmp    -- summary <symbol>      # Analyst consensus
npm run gecko  -- solana                # SOL/on-chain snapshot
npm run dex    -- search "<query>"      # Cross-chain pair search
npm run fng    -- current               # Fear & Greed
npm run sec    -- filings <symbol>      # SEC filings
```

---

## Wiki Maintenance

After reviewing a closed trade:
1. Update `wiki/symbols/<SYMBOL>.md` — add trade to history, update what works / watch out for
2. Update `wiki/setups/<SETUP>.md` — update stats
3. Update `wiki/mistakes.md` — increment any triggered mistakes
4. Update `wiki/edges.md` — update sample counts and stats
5. Update `wiki/INDEX.md` — reflect any changes
6. Update **Open Positions** table above

After running adapter snapshots:
1. Update local `wiki/market/context.md` with fresh macro and sentiment data
