/**
 * Alpaca adapter — paper and live trading + market data.
 *
 * Defaults to paper trading. Live requires explicit { live: true } or ALPACA_LIVE=true.
 *
 * Requires ALPACA_API_KEY + ALPACA_API_SECRET in .env.
 * Paper and live accounts have separate key pairs — get both at alpaca.markets.
 *
 * Market data (data.alpaca.markets) uses the same keys and is the primary
 * fallback for equity bars when Yahoo Finance or Massive are unavailable.
 */

export { AlpacaClient, AlpacaError } from "./client.mjs";

export {
  getAccount,
  getAccountSummary,
  getPortfolioHistory,
  getPositions,
  getPosition,
  closePosition,
  closeAllPositions,
  getOrders,
  getOrder,
  placeOrder,
  cancelOrder,
  cancelAllOrders,
  replaceOrder,
  placeOcoExit,
  getClock,
  getCalendar,
  getAsset,
  isTradeable,
  getActivities,
} from "./trading.mjs";

export {
  getBars,
  getCryptoBars,
  getLatestQuote,
  getLatestTrade,
  getSnapshots,
  getBarsForForecast,
} from "./market-data.mjs";

export { getNews } from "./news.mjs";
export { getOptionSnapshots, getOptionChain, getExpectedMove } from "./options.mjs";
export { getCorporateActions } from "./corporate-actions.mjs";
