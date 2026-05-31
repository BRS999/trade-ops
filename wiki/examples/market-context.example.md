# Market Context
_Last updated: YYYY-MM-DD_

This file is local-only and not committed. Update it after running macro adapter snapshots.
Run: `npm run fred -- macro`, `npm run fng -- equity-snapshot`, `npm run cftc -- snapshot spx ndx gold crude`

---

## Macro

| Series | Value | Date | Notes |
|---|---|---|---|
| 2Y Treasury | X.XX% | YYYY-MM-DD | |
| 10Y Treasury | X.XX% | YYYY-MM-DD | |
| VIX | XX.X | YYYY-MM-DD | |
| Fed Funds | X.XX% | YYYY-MM-DD | |

---

## Sentiment

### Equity (CNN Fear & Greed) — `npm run fng -- equity-snapshot`
| Indicator | Score | Rating |
|---|---|---|
| **Composite** | **XX** | **?** |
| Put/Call Options | XX | ? |
| Momentum | XX | ? |
| VIX vs 50MA | XX | ? |
| Price Breadth | XX | ? |
| Junk Bond Demand | XX | ? |

### Crypto (alternative.me) — `npm run fng -- current`
| Value | Rating |
|---|---|
| XX | ? |

---

## COT Positioning — `npm run cftc -- snapshot spx ndx gold crude`

| Instrument | Spec Net | Spec Net % OI | Signal |
|---|---|---|---|
| SPX | | | |
| NDX | | | |
| Gold | | | |
| Crude | | | |

---

## FINRA Short Volume Highlights — `npm run finra -- multi <symbols>`

Notable elevated short volume names:

| Symbol | Short Vol % | Notes |
|---|---|---|
| | | |

---

## Active Themes

- Theme 1
- Theme 2
