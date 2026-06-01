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

export function getQuote(client, symbol) {
  return client.call("quote", symbol);
}

export function getProfile(client, symbol) {
  return client.call("companyProfile2", symbol);
}

export function getBasicFinancials(client, symbol, metric = "all") {
  return client.call("companyBasicFinancials", symbol, metric);
}

export function getPeers(client, symbol) {
  return client.call("companyPeers", symbol);
}

// ── Insider & alternative data ─────────────────────────────────────────────

export function getInsiderTransactions(client, symbol, opts = {}) {
  return client.call("insiderTransactions", symbol, opts);
}

export function getInsiderSentiment(client, symbol, from, to) {
  return client.call("insiderSentiment", symbol, from, to);
}

export function getCongressionalTrading(client, symbol, from, to) {
  return client.call("congressionalTrading", symbol, from, to);
}

export function getSocialSentiment(client, symbol, opts = {}) {
  return client.call("socialSentiment", symbol, opts);
}

// ── News ───────────────────────────────────────────────────────────────────

export function getCompanyNews(client, symbol, from, to) {
  return client.call("companyNews", symbol, from, to);
}

export function getNewsSentiment(client, symbol) {
  return client.call("newsSentiment", symbol);
}

export function getMarketNews(client, category = "general", opts = {}) {
  return client.call("marketNews", category, opts);
}

// ── Earnings & estimates ───────────────────────────────────────────────────

export function getEarningsCalendar(client, opts = {}) {
  return client.call("earningsCalendar", opts);
}

export function getEarnings(client, symbol, opts = {}) {
  return client.call("companyEarnings", symbol, opts);
}

export function getUpgradeDowngrade(client, opts = {}) {
  return client.call("upgradeDowngrade", opts);
}

export function getPriceTarget(client, symbol) {
  return client.call("priceTarget", symbol);
}

export function getRecommendationTrends(client, symbol) {
  return client.call("recommendationTrends", symbol);
}

// ── Macro ──────────────────────────────────────────────────────────────────

export function getEconomicCalendar(client, opts = {}) {
  return client.call("economicCalendar", opts);
}

// ── Snapshot ───────────────────────────────────────────────────────────────

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
