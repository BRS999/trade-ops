/**
 * Massive adapter — public API.
 *
 * Responsibilities:
 *   - Historical OHLCV bars (getBars, getAllBars)
 *   - Ticker fundamentals (getTickerDetails)
 *   - Past financials/earnings (getFinancials)
 *   - Previous day bar (getPrevDay)
 *   - Options data (getOptionContracts, getOptionChainSnapshot, getOptionTrades, scanUnusualOptions)
 *   - Futures data (getFuturesContracts, getFuturesProducts, getFuturesSnapshots, getFuturesBars, trades, exchanges, quotes, market-status)
 *   - Fed economic data (getInflation, getLaborMarket, getTreasuryYields, getInflationExpectations, getYieldCurve)
 *   - Benzinga news (getNews, getStockNews)
 *   - Short interest & short volume (getShortInterest, getLatestShortInterest, getShortVolume)
 *   - Dividends & splits (getDividends, getSplits)
 *   - Market status & holidays (getMarketStatus, getMarketHolidays, getUniversalSnapshot, getRelatedCompanies)
 *   - Crypto data (getCryptoBars, getCryptoSnapshots, getCryptoTickerSnapshot, getCryptoTrades)
 *   - Forex data (getForexBars, getForexQuote, getForexSnapshots)
 *   - Index data (getIndexBars, getIndexSnapshots, getMajorIndices)
 *   - ETF data (getEtfAnalytics, getEtfConstituents, getEtfFundFlows, getEtfProfile, getEtfTopHoldings)
 *
 * Live price enrichment is handled by the Yahoo Finance adapter
 * (adapters/yahoo) which has no plan restrictions.
 *
 * Entitlements vary by account plan. The smoke runner reports 403 responses
 * as plan-gated, distinct from route/client failures.
 *
 * Confirmed on the current account:
 *   - Available: stocks prev-day/details/financials/bars, option contracts,
 *     futures contracts/products/schedules/bars/exchanges/status, Fed data,
 *     short data, dividends/splits, market status/holidays/related companies,
 *     crypto bars, forex bars.
 *   - Plan-gated: stock/universal snapshots, Benzinga news, crypto/forex
 *     snapshots, forex quotes, index data, ETF data, option chain/trades,
 *     futures snapshots/trades/quotes, crypto trades.
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
  getFuturesExchanges,
  getFuturesMarketStatus,
  getFuturesQuote,
  getFrontContract,
} from "./futures.mjs";
export {
  getInflation,
  getInflationExpectations,
  getLaborMarket,
  getTreasuryYields,
  getYieldCurve,
} from "./fed.mjs";
export { getNews, getStockNews } from "./news.mjs";
export {
  getShortInterest,
  getLatestShortInterest,
  getShortVolume,
  getDividends,
  getSplits,
} from "./stocks-extra.mjs";
export {
  getMarketStatus,
  getMarketHolidays,
  getUniversalSnapshot,
  getRelatedCompanies,
} from "./market.mjs";
export {
  getCryptoBars,
  getCryptoSnapshots,
  getCryptoTickerSnapshot,
  getCryptoTrades,
} from "./crypto.mjs";
export {
  getForexBars,
  getForexQuote,
  getForexSnapshots,
} from "./forex.mjs";
export {
  getIndexBars,
  getIndexSnapshots,
  getMajorIndices,
} from "./indices.mjs";
export {
  getEtfAnalytics,
  getEtfAnalyticsLatest,
  getEtfConstituents,
  getEtfTopHoldings,
  getEtfFundFlows,
  getEtfProfile,
} from "./etf.mjs";
