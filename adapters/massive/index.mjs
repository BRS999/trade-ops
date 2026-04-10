/**
 * Massive adapter — public API.
 *
 * Responsibilities:
 *   - Historical OHLCV bars (getBars, getAllBars)
 *   - Ticker fundamentals (getTickerDetails)
 *   - Past financials/earnings (getFinancials)
 *   - Previous day bar (getPrevDay)
 *
 * Live price enrichment is handled by the Yahoo Finance adapter
 * (adapters/yahoo) which has no plan restrictions.
 */

export { MassiveClient, MassiveError } from "./client.mjs";
export { getSnapshot, getSnapshots, getPrevDay } from "./quotes.mjs";
export { getBars, getAllBars } from "./bars.mjs";
export { getTickerDetails } from "./tickers.mjs";
export { getFinancials } from "./earnings.mjs";
