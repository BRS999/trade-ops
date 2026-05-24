# Signals

The `signals/` folder holds the normalized object layer between raw adapter output and trade planning.

Tracked folders:

- `schema/` defines observation, signal, opportunity score, and signal candidate contracts.
- `examples/` contains scrubbed examples that document intended shape and workflow.

Local folder:

- `candidates/` is for generated candidate records and is ignored by Git except for `.gitkeep`.

Core flow:

```text
observations -> signals -> candidates -> research memo -> trade plan
```

A signal candidate is not a trade. It is a ranked research object. It cannot become a trade plan unless its `promotion_gate.can_promote_to_trade_plan` is true and the human explicitly approves any live execution.

See `docs/SIGNAL_ENGINE.md` for the full workflow.
