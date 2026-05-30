/**
 * Finnhub adapter — public API.
 *
 * Primary use cases:
 *   - Insider transactions (SEC Form 4) and insider sentiment (MSPR)
 *   - Congressional / Senate stock trades
 *   - Earnings calendar, earnings surprises, analyst estimates
 *   - Company and market news with sentiment scores
 *   - Social sentiment (Reddit/Twitter)
 *   - Analyst upgrades/downgrades and price targets
 *   - Economic calendar
 *
 * All data that Yahoo, Polygon, and FMP don't cover well.
 */

export { FinnhubClient, FinnhubError } from "./client.mjs";

// ── Quote & profile ────────────────────────────────────────────────────────

/** Real-time quote: price, open, high, low, prev close, change %. */
export function getQuote(client, symbol) {
  return client.call("quote", symbol);
}

/** Company profile: name, exchange, industry, market cap, shares outstanding, logo, URL. */
export function getProfile(client, symbol) {
  return client.call("companyProfile2", symbol);
}

/** Key financial metrics: P/E, EPS, revenue growth, margins, debt ratios. */
export function getBasicFinancials(client, symbol, metric = "all") {
  return client.call("companyBasicFinancials", symbol, metric);
}

/** Peer companies in the same sector/industry. */
export function getPeers(client, symbol) {
  return client.call("companyPeers", symbol);
}

// ── Insider & alternative data ─────────────────────────────────────────────

/**
 * SEC Form 4 insider transactions: buys, sells, grants, exercised options.
 *
 * @param {string}  symbol
 * @param {Object}  [opts]
 * @param {string}  [opts.from]   YYYY-MM-DD
 * @param {string}  [opts.to]     YYYY-MM-DD
 */
export function getInsiderTransactions(client, symbol, opts = {}) {
  return client.call("insiderTransactions", symbol, opts);
}

/**
 * Insider sentiment: Monthly Share Purchase Ratio (MSPR).
 * +100 = all insiders buying, -100 = all selling.
 *
 * @param {string} symbol
 * @param {string} from    YYYY-MM-DD
 * @param {string} to      YYYY-MM-DD
 */
export function getInsiderSentiment(client, symbol, from, to) {
  return client.call("insiderSentiment", symbol, from, to);
}

/**
 * Congressional / Senate stock trades reported under the STOCK Act.
 *
 * @param {string}  symbol
 * @param {string}  from   YYYY-MM-DD
 * @param {string}  to     YYYY-MM-DD
 */
export function getCongressionalTrading(client, symbol, from, to) {
  return client.call("congressionalTrading", symbol, from, to);
}

/**
 * Social sentiment from Reddit and Twitter.
 *
 * @param {string}  symbol
 * @param {Object}  [opts]
 * @param {string}  [opts.from]  YYYY-MM-DD
 * @param {string}  [opts.to]    YYYY-MM-DD
 */
export function getSocialSentiment(client, symbol, opts = {}) {
  return client.call("socialSentiment", symbol, opts);
}

// ── News ───────────────────────────────────────────────────────────────────

/**
 * Company-specific news articles.
 *
 * @param {string} symbol
 * @param {string} from    YYYY-MM-DD
 * @param {string} to      YYYY-MM-DD
 */
export function getCompanyNews(client, symbol, from, to) {
  return client.call("companyNews", symbol, from, to);
}

/**
 * News sentiment score for a symbol: bullish/bearish ratio, buzz, article count.
 */
export function getNewsSentiment(client, symbol) {
  return client.call("newsSentiment", symbol);
}

/**
 * General market news.
 *
 * @param {string} [category]  general (default) | forex | crypto | merger
 * @param {Object} [opts]
 * @param {number} [opts.minId] Return news with id > minId (for pagination)
 */
export function getMarketNews(client, category = "general", opts = {}) {
  return client.call("marketNews", category, opts);
}

// ── Earnings & estimates ───────────────────────────────────────────────────

/**
 * Upcoming and recent earnings releases.
 *
 * @param {Object} [opts]
 * @param {string} [opts.from]    YYYY-MM-DD
 * @param {string} [opts.to]      YYYY-MM-DD
 * @param {string} [opts.symbol]  Filter to a single symbol
 * @param {string} [opts.international] Include international stocks
 */
export function getEarningsCalendar(client, opts = {}) {
  return client.call("earningsCalendar", opts);
}

/**
 * Historical earnings results with EPS actual vs estimate and surprise %.
 *
 * @param {string}  symbol
 * @param {Object}  [opts]
 * @param {number}  [opts.limit]  Number of quarters (default 4)
 */
export function getEarnings(client, symbol, opts = {}) {
  return client.call("companyEarnings", symbol, opts);
}

/**
 * Analyst upgrades and downgrades.
 *
 * @param {Object} [opts]
 * @param {string} [opts.symbol]  Filter to a single symbol
 * @param {string} [opts.from]    YYYY-MM-DD
 * @param {string} [opts.to]      YYYY-MM-DD
 */
export function getUpgradeDowngrade(client, opts = {}) {
  return client.call("upgradeDowngrade", opts);
}

/** Analyst consensus price target: high, low, mean, median. */
export function getPriceTarget(client, symbol) {
  return client.call("priceTarget", symbol);
}

/** Analyst buy/hold/sell recommendation trend by month. */
export function getRecommendationTrends(client, symbol) {
  return client.call("recommendationTrends", symbol);
}

// ── Macro ──────────────────────────────────────────────────────────────────

/**
 * Economic data calendar (CPI, NFP, FOMC, etc.).
 *
 * @param {Object} [opts]
 * @param {string} [opts.from]  YYYY-MM-DD
 * @param {string} [opts.to]    YYYY-MM-DD
 */
export function getEconomicCalendar(client, opts = {}) {
  return client.call("economicCalendar", opts);
}

// ── Snapshot ───────────────────────────────────────────────────────────────

/**
 * Equity intelligence snapshot for a symbol: quote + news sentiment +
 * insider sentiment + analyst consensus in one call.
 *
 * @param {string} symbol
 * @param {string} [from]   Lookback start for insider sentiment (default: 90 days ago)
 */
export async function getEquitySnapshot(client, symbol, from) {
  const to = new Date().toISOString().slice(0, 10);
  if (!from) {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    from = d.toISOString().slice(0, 10);
  }

  const [quote, sentiment, insiderSentiment, priceTarget, recommendations] =
    await Promise.allSettled([
      getQuote(client, symbol),
      getNewsSentiment(client, symbol),
      getInsiderSentiment(client, symbol, from, to),
      getPriceTarget(client, symbol),
      getRecommendationTrends(client, symbol),
    ]);

  const val = (r) => (r.status === "fulfilled" ? r.value : null);

  const rec = val(recommendations);
  const latestRec = Array.isArray(rec) ? rec[0] : null;

  return {
    symbol,
    as_of: new Date().toISOString(),
    quote: val(quote),
    news_sentiment: val(sentiment),
    insider_sentiment: val(insiderSentiment)?.data ?? null,
    price_target: val(priceTarget),
    recommendation: latestRec,
  };
}
