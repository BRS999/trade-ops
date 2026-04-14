# Market Wiki

`wiki/market/` is the local market operating layer for Trade-Ops.

This folder is intentionally separate from the shareable knowledge base. It exists so you can keep live macro context, current regime notes, and working market state on your machine without turning the repo into a dump of time-sensitive notes.

## What Belongs Here

- current macro snapshot
- current sentiment snapshot
- regime notes that affect sizing or setup selection
- live watchlist context
- temporary market conclusions that may change quickly

## What Does Not Belong Here

- reusable setup definitions
- stable symbol notes that are useful as tracked examples
- adapter code
- schemas or templates
- personal trade records

Those belong elsewhere in the repo:

- `wiki/setups/` for reusable setup knowledge
- `wiki/symbols/` for reusable symbol notes
- `journal/` for trade records
- `adapters/` and `tools/` for code

## Expected Local Files

Common local files in this folder:

- `context.md` — current macro, sentiment, earnings, and board state
- `regimes.md` — active regime notes and sizing checklist

You can create additional local files if they help your process, but they should stay time-sensitive and disposable.

Example structure:

```text
wiki/market/
├── README.md        # tracked: explains the folder contract
├── context.md       # local: current macro and market snapshot
├── regimes.md       # local: active regime notes
└── notes.md         # local: optional scratch market observations
```

If you want to keep the folder minimal, only `context.md` and `regimes.md` are expected by default.

## Public Repo Rule

Do not commit personal or time-sensitive market state.

This means files in `wiki/market/` should be treated like local operating notes, not canonical project assets.

## Fresh Clone Setup

After cloning the repo, create local files here as needed. A simple starting point is:

```text
wiki/market/context.md
wiki/market/regimes.md
```

These files can be created manually or written by the agent during a research session.
