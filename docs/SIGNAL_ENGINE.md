# Trade-Ops Signal Engine

The signal engine is the research layer between raw adapters and trade planning.

Its first job is ranked attention:

```text
raw tools -> exploration -> candidates -> memo -> trade plan -> journal/review
```

It is not an autonomous trading system. It does not replace TradingView. It gives Codex, Claude Code, and the human trader a shared grammar for market research.

## Object Layers

### Observation

An observation is a factual market event with source provenance.

Examples:

- BTC is up 3.2% over 24h.
- SOL is outperforming ETH by 2.1%.
- Kalshi YES price moved from 42% to 58%.
- NVDA volume is 1.8x its 20-day average.

Observations should avoid interpretation. They should preserve `source`, `source_command`, `as_of`, and `freshness_status` whenever possible.

Schema: `signals/schema/observation.schema.json`

### Signal

A signal is an interpretation of one or more observations.

Examples:

- relative strength
- volatility expansion
- event repricing
- liquidity deterioration
- catalyst drift

Signals classify behavior. They do not make trade decisions.

Schema: `signals/schema/signal.schema.json`

Important distinction: raw data tools should not emit trade decisions. They provide context, measurements, and source facts. Trade signals and candidates are created only after a separate exploration step asks how to express the facts through long, short, hedge, event, speculative, or research-only opportunities.

### Signal Candidate

A signal candidate is a possible opportunity worthy of ranking, research, rejection, or monitoring.

Candidates are the main bridge from research scanning to decision workflows. A candidate can be interesting and still not tradeable.

Schema: `signals/schema/signal-candidate.schema.json`

## Candidate Lifecycle

```text
detected
candidate
researched
watch
stalk
planned
rejected
expired
trade_created
reviewed
```

Promotion to a trade plan is blocked unless the candidate has fresh data, a clear thesis, counter-evidence, invalidation, risk/reward, portfolio risk check, and skeptic review.

## Edge Families

Initial edge families:

- `relative_strength`
- `event_repricing`
- `volatility_compression_expansion`
- `narrative_momentum`
- `mean_reversion`
- `liquidity_migration`
- `catalyst_drift`
- `risk_regime`
- `other`

The edge family is more important than the asset class for learning. A relative-strength candidate in crypto and a sector-relative-strength candidate in equities can teach the same process lesson.

## Scoring

Every candidate should carry a transparent opportunity score:

- signal strength: 0-20
- data quality: 0-15
- cross-source agreement: 0-15
- risk/reward clarity: 0-15
- liquidity/execution: 0-10
- regime alignment: 0-10
- catalyst quality: 0-10
- novelty/asymmetry: 0-5

Penalties are explicit and auditable. Common penalties include stale data, low liquidity, no clear invalidation, overextension, and duplicate exposure.

Schema: `signals/schema/opportunity-score.schema.json`

## Research Handoff

Promising candidates should become research memos before they become trade plans.

Research memos must include:

- candidate summary
- market context
- thesis
- evidence
- counter-evidence
- model-vs-market
- regime alignment
- risk/reward
- expression
- invalidation
- skeptic review
- decision
- review plan

Schemas:

- `research/schema/investment-memo.schema.json`
- `research/schema/skeptic-review.schema.json`

## Repo State Rules

Tracked:

- `signals/schema/`
- `signals/examples/`
- `research/schema/`
- `research/examples/`
- docs

Local by default:

- `signals/candidates/`
- `research/memos/`
- `reports/daily-board/`
- `reports/weekly-review/`
- `reports/attribution/`

Generated records can be promoted into examples only after they have been scrubbed of personal or time-sensitive operating state.

## First MVP Workflow

The first useful workflow should answer:

```text
What are the top opportunities worth researching today?
```

Suggested exploration loop:

1. Check open risk in TradingView and `journal/open/`.
2. Choose a research question or pocket, then call the relevant raw tools.
3. Compare possible expressions: long, short, hedge, event market, futures/options, high-beta paper test, or reject.
4. Create or refresh candidates from the findings.
5. Score candidates.
6. Promote only the candidates with thesis, invalidation, risk, and review plan.

No live execution is part of the signal engine MVP.

## Exploration Rule

The daily board is a detective workflow, not an oracle. There is intentionally no all-in-one market survey command. Bundled surveys can become hidden decision engines and bias the system toward canned conclusions.

Raw tools should answer:

- what is moving
- what is leading
- what is lagging
- what is crowded
- what is stale or missing
- where activity is clustering

Raw tools should not answer:

- whether to trade
- whether to stand aside
- which setup is approved
- whether a candidate has enough edge

Those decisions belong to exploration, candidate scoring, memo work, risk checks, and human approval.

## Opportunity-Seeking Mandate

The system exists to find risk-defined opportunities, not to repeatedly certify inactivity.

Risk discipline still matters: do not force low-quality trades, do not ignore stops, and do not treat LLM judgment as alpha by itself. But a board that frequently ends with generic `no trade` is a process warning. It usually means the search space is too narrow, the scanner is too shallow, the expression set is too limited, or the workflow stopped before forming enough candidate bets.

Daily work should normally produce a ranked opportunity set, even if the final action is paper-only or research-only. The expected output is not "buy something no matter what"; it is "here are the best risk-defined ways we found to express today's market read."

A valid board should try to surface at least:

- one long candidate
- one short or hedge candidate
- one event-market or model-vs-market candidate
- one high-beta/speculative candidate
- one `do nothing here because...` rejection with concrete evidence

If none of those can be produced, the board should mark this as a search failure or data failure before calling it a market conclusion.

Use these action labels carefully:

- `trade now`: fresh data, clear setup, defined entry, stop, target, risk, and no unresolved blocker
- `paper_trade_candidate`: good enough to test with paper risk, but still needs human approval before execution
- `stalk`: promising but waiting for a trigger or better price
- `research`: possible edge, but needs memo/model/rule work first
- `watch`: useful context, not close to expression yet
- `reject`: specific failure reason such as low liquidity, no invalidation, stale data, or bad risk/reward
- `no trade`: only after the board has ranked candidates and explained why none deserve paper or live expression

## No-Trade Debugging

When `no trade` appears repeatedly, debug the process instead of accepting the answer.

Common failure modes:

- Universe too narrow: only large liquid names are scanned, while high-beta, event, DEX, or sector pockets are ignored.
- Expression too narrow: the system looks mostly for longs and forgets shorts, hedges, options/futures, spreads, prediction markets, or paper-only experiments.
- Regime overfiltering: a mixed or risk-off regime blocks all trades instead of changing the expression.
- Entry perfectionism: strong candidates are downgraded forever because the system demands a perfect entry rather than defining a conditional trigger.
- Missing model-vs-market work: event markets get ignored because no internal probability is generated.
- Safety gates applied too early: risky universes like Solana new tokens should be filtered, but the scan should still keep searching for the subset that clears gates.
- Tool failure treated as market signal: missing TradingView, API failures, or stale data should create a data-quality warning, not a market conclusion.
- Scanner bias: an all-in-one scan starts to frame the conclusion before the agent has explored enough expressions.

Process KPI:

- Track how often boards produce at least one `paper_trade_candidate`, `trade now`, or `research` candidate.
- Track false positives and losses through attribution.
- If the system produces mostly `no trade`, expand the universe, add sources, improve ranking, or change expressions before tightening filters further.

The board should distinguish between:

- `tool output`: source facts from raw APIs
- `agent interpretation`: the current read on what those facts may mean
- `candidate`: a possible expression with thesis, counter-evidence, invalidation, and risk
- `no trade`: a final research conclusion after candidate exploration, not a scanner output
