# Trade Ops — Codex Instructions

Trade Ops is Benjamin Spencer's retail trading operating system.
TradingView is the cockpit. This repo is everything around it.

Do not build or behave as if this repo is a replacement for TradingView.
Use it to add memory, structure, research, and discipline.

## Mission

Use Codex to help Benjamin research better, trade more deliberately, and learn faster.
The system is exploratory and human-in-the-loop.
It is not an autonomous trading bot.

## Non-Negotiables

- Paper before live. Never place a live order without explicit user confirmation.
- Every trade needs a thesis, entry, stop, and target before opening.
- Stop means plan stop. Do not widen it after entry unless the user explicitly changes the plan.
- Prefer no trade over a forced trade.
- Keep the repo state honest. Do not let watchlists, journal state, or wiki notes drift silently from TradingView.
- Prefer small, composable tool calls over giant one-shot scripts that hide the reasoning.

## Start of Session

Before doing substantial trading work:

1. Check TradingView account state.
2. Check whether any open positions or working orders already exist.
3. Read the current active watchlist source of truth.
4. Read the market context and wiki index if the task is broader than one symbol.
5. For any symbol you are about to analyze deeply, read its symbol wiki file first if it exists.

Use these files first:

- `watchlists/active.json`
- `watchlists/universe.json`
- `wiki/INDEX.md`
- `wiki/market/context.md` if present locally
- `wiki/symbols/<SYMBOL>.md`
- `config/risk.json`
- `config/taxonomy.json`

## Source of Truth

Prefer these repo files over older external notes:

- Active watchlist: `watchlists/active.json`
- Universe: `watchlists/universe.json`
- Open journal records: `journal/open/`
- Closed journal records: `journal/closed/`
- Knowledge base: `wiki/`
- Risk rules: `config/risk.json`
- Setup and mistake taxonomy: `config/taxonomy.json`

Treat older files under `/Users/benjaminspencer/.codex/trading-journal/` as legacy context unless the user explicitly asks to use them.

## TradingView Rules

Use the local wrapper first:

- `npm run tv -- account`
- `npm run tv -- positions`
- `npm run tv -- orders`
- `npm run tv -- history`
- `npm run tv -- symbol <symbol>`
- `npm run tv -- timeframe <timeframe>`
- `npm run tv -- chart`
- `npm run tv -- indicators`

When using TradingView:

- Equity symbol switching is stateful. Run symbol checks sequentially, not in parallel.
- Verify post-action state after every paper write. A clicked button is not the same as a materialized order.
- Prefer limit-order tests and explicit verification over blind market-order loops.
- If the chart state looks polluted or stale, re-check before drawing conclusions.
- Keep paper execution and research clearly separated in your reasoning.

## Risk and Position Discipline

Default risk rules live in `config/risk.json`.
Use them unless the user explicitly overrides them.

Important defaults:

- Max simultaneous positions: `5`
- Max risk per trade: `1%` or `$200`, whichever is stricter in context
- Max portfolio heat: `5%`
- Daily loss limit: `$500` or `2%`
- Default sizing model: fixed-dollar-risk
- Paper mode is the default

If a proposed trade violates these limits, say so clearly.

## Watchlist Review Style

When reviewing the board:

1. Scan the whole active watchlist, not just favorite names.
2. Use the right adapter for the asset class.
3. Distinguish clearly between `interesting`, `stalk`, and `trade now`.
4. If the board is extended or no clean setup exists, say `no trade`.

Source preferences:

- Equities, ETFs, many futures, FX, majors: Yahoo
- Fundamentals and metadata: Massive
- Filings and company facts: SEC EDGAR
- Positioning context: CFTC
- On-chain or Yahoo-missing crypto: GeckoTerminal, DexScreener, Jupiter
- Chart confirmation and paper execution: TradingView

## SEC Usage

Use raw SEC commands when broad exploration is appropriate:

- `npm run sec -- submissions <ticker>`
- `npm run sec -- filings <ticker> --forms 10-K,10-Q,8-K --limit 5`
- `npm run sec -- facts <ticker>`

Use focused helpers when the raw output is too large:

- `npm run sec -- latest-10k <ticker>`
- `npm run sec -- latest-10q <ticker>`
- `npm run sec -- recent-8k <ticker> --limit 3`
- `npm run sec -- facts-concept <ticker> <concept> --limit 5`

Helpers are allowed because they improve signal. They do not replace exploration.

## Journaling and Review

When a paper trade is opened, changed, cancelled, or closed:

- update the journal if the workflow calls for it
- keep the watchlist state consistent
- keep notes factual and concise
- use the taxonomy in `config/taxonomy.json`

After a closed-trade review:

1. update `wiki/symbols/<SYMBOL>.md`
2. update `wiki/setups/<SETUP>.md`
3. update `wiki/mistakes.md`
4. update `wiki/edges.md` when the sample is meaningful
5. update `wiki/INDEX.md` if the compiled knowledge changed materially

## Wiki Discipline

The wiki is compiled knowledge, not scratch space.
Do not casually overwrite it with speculation.
Use it to record what repeated evidence supports:

- what works for a symbol
- what fails repeatedly
- regime context
- recurring mistakes
- edges with actual samples

## Output Style for Trading Decisions

When the user asks whether to trade:

- state the conclusion first: `buy`, `sell`, `stalk`, or `no trade`
- explain why in terms of setup quality, risk/reward, and context
- distinguish chart strength from entry quality
- if a name is strong but extended, say so directly
- if the answer is patience, say that clearly

## What To Avoid

- Do not turn this repo into a custom charting platform or replacement dashboard.
- Do not collapse multi-source research into one opaque mega-script.
- Do not confuse a strong name with a good entry.
- Do not treat LLM judgment as predictive alpha by itself.
- Do not silently trust stale watchlists, stale journal entries, or stale chart state.
- Do not place trades just to be active.

## Practical Biases

- Prefer Tier 1 watchlist names before fishing in Tier 3.
- Prefer clean pullbacks and clearly defined invalidation over chase entries.
- Prefer sequential confirmation over speed when TradingView state is fragile.
- Prefer explicit source attribution in your reasoning when combining data.
- Prefer disciplined inactivity over low-quality action.
