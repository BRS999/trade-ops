# TradingView Adapter

This module owns the Trade Ops interface to TradingView.

Trade Ops should code against this adapter, not directly against third-party TradingView tooling.

Important: the current implementation targets the TradingView desktop app. It should not be treated as a generic TradingView web adapter.

Initial responsibilities:

- get chart state
- get indicator values
- set symbol
- set timeframe
- read paper positions
- read working orders
- place paper orders
- close paper positions
- capture screenshots or chart references

V1 may wrap the existing external TradingView MCP or CLI implementation.

## Current V1 Surface

The first adapter implementation lives in [client.mjs](/Users/benjaminspencer/git/trade-ops/adapters/tradingview/client.mjs).

Current supported methods:

- `getChartState()`
- `getIndicatorValues()`
- `setSymbol(symbol)`
- `setTimeframe(timeframe)`
- `getPaperPositions()`
- `getWorkingOrders()`
- `getOrderHistory()`
- `getAccountSummary()`
- `placePaperOrder({ symbol, side, type, quantity, limitPrice })`
- `closePaperPosition(symbol)`
- `cancelPaperOrder(identifier)`

These methods currently wrap the existing TradingView CLI bridge.

## Current Validation Status

The following methods have been exercised against the live TradingView desktop app:

- `getChartState()`
- `getIndicatorValues()`
- `setSymbol(symbol)`
- `getPaperPositions()`
- `getWorkingOrders()`
- `getOrderHistory()`
- `getAccountSummary()`
- `placePaperOrder(...)` via a paper `market` buy
- `closePaperPosition(symbol)` via the row `Close` action and confirmation dialog
- `cancelPaperOrder(identifier)` via the row `Cancel` action and confirmation dialog

The write path is now functional for simple paper order placement, order cancellation, and position closing, but it remains DOM-driven and should still be treated as paper-first.

## V1 Execution Notes

The first execution implementation is intentionally conservative.

- Supported order types: `market`, `limit`
- Unsupported in V1: more advanced order-entry variations, bracket attachment, and full broker-specific customization
- Execution methods rely on the live TradingView desktop DOM and should be treated as paper-first until hardened further
