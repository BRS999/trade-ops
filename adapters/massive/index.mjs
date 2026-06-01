/**
 * Massive adapter — public API.
 *
 * Responsibilities:
 *   - Historical OHLCV bars (getBars, getAllBars)
 *   - Ticker fundamentals (getTickerDetails)
 *   - Past financials/earnings (getFinancials)
 *   - Previous day bar (getPrevDay)
 *   - Options data (getOptionContracts, getOptionChainSnapshot, getOptionTrades, scanUnusualOptions)
 *
 * Live price enrichment is handled by the Yahoo Finance adapter
 * (adapters/yahoo) which has no plan restrictions.
 *
 * Options endpoints require a paid plan (Starter $29/mo+ for snapshots,
 * Developer $79/mo+ for trades). Contracts reference is free.
 */

export { MassiveClient, MassiveError } from "./client.mjs";
export { getSnapshot, getSnapshots, getPrevDay } from "./quotes.mjs";
export { getBars, getAllBars } from "./bars.mjs";
export { getTickerDetails } from "./tickers.mjs";
export { getFinancials } from "./earnings.mjs";
export {
  getOptionContracts,
  getOptionContract,
  getOptionChainSnapshot,
  getOptionTrades,
  getOptionBars,
  scanUnusualOptions,
} from "./options.mjs";
export {
  getFuturesContracts,
  getFuturesContract,
  getFuturesProducts,
  getFuturesSchedule,
  getFuturesSnapshots,
  getFuturesBars,
  getFuturesTrades,
  getFrontContract,
} from "./futures.mjs";
