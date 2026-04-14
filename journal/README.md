# Journal

Trade-level durable storage. Every trade has a paired JSON + Markdown record.

## Directory Structure

```
journal/
  schema/
    trade.schema.json          Core trade record schema
    equity-extension.json      asset_details shape for equities
    crypto-extension.json      asset_details shape for crypto
    prediction-extension.json  asset_details shape for prediction markets
  templates/
    trade.template.json        Blank JSON record to copy for new trades
    trade.template.md          Blank Markdown record to copy for new trades
  open/                        Active positions (JSON + MD pairs)
  closed/                      Closed trades (JSON + MD pairs)
  examples/                    Reference examples for each asset class
```

## Public Repo Behavior

The repo keeps reusable journal structure in Git while leaving real trading history on your machine.

- `journal/examples/` stays committed as reference data
- `journal/open/` is for local active trades and is gitignored by default
- `journal/closed/` is for local completed trades and is gitignored by default
- create `journal/open/` and `journal/closed/` locally if they do not exist in your clone

Keep reusable examples, templates, and schema in Git. Keep your personal journal entries local.

## File Naming

```
YYYY-MM-DD-{SYMBOL}-{asset_class}-{6-char-id}.json
YYYY-MM-DD-{SYMBOL}-{asset_class}-{6-char-id}.md
```

Use the entry date once a trade moves to `open`. Use the planning date for earlier states.

## Lifecycle

Trades move from `open/` to `closed/` when the position is exited. Both files move together.

## Creating a New Trade

1. Copy `templates/trade.template.json` and `templates/trade.template.md` into `journal/open/`
2. Rename with the correct date, symbol, asset class, and a short unique ID
3. Fill in `id`, `created_at`, `state`, `symbol`, `asset_class`, `side`, `thesis`, `setup_type`
4. Define the `plan` block before moving to `planned`
5. Update `state_history` at each transition

## Schema

Core schema: `schema/trade.schema.json`
Asset-class specific fields go in `asset_details` — see the extension schemas for the expected shape per asset class.

## Review

After closing a trade, fill in the `review` block before moving state to `reviewed`.
Mistake tags must come from the controlled list in `config/taxonomy.json`.
