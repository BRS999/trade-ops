# Research

The `research/` folder holds memo schemas, memo examples, and local generated research packets.

Tracked folders:

- `schema/` defines investment memo and skeptic review contracts.
- `examples/` contains scrubbed examples.

Local folder:

- `memos/` is for generated candidate research packets and is ignored by Git except for `.gitkeep`.

Research memos convert signal candidates into auditable decision artifacts. They should preserve evidence, counter-evidence, model-vs-market reasoning, risk/reward, invalidation, skeptic review, and the final decision.

Valid memo decisions:

- `no_trade`
- `watch`
- `stalk`
- `paper_trade`
- `live_trade_candidate`
- `reject`
