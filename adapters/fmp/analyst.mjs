/**
 * FMP analyst data.
 *
 * getPriceTargetConsensus(client, symbol)   → high/low/median/consensus price targets
 * getAnalystEstimates(client, symbol, opts) → forward EPS + revenue estimates
 * getEarningsCalendar(client, opts)         → upcoming/recent earnings with actual vs estimate
 * getEconomicCalendar(client, opts)         → scheduled macro events (CPI, NFP, FOMC, PCE...)
 */

/**
 * @typedef {Object} PriceTargetConsensus
 * @property {string} symbol
 * @property {number|null} targetHigh
 * @property {number|null} targetLow
 * @property {number|null} targetConsensus
 * @property {number|null} targetMedian
 */

/**
 * @typedef {Object} AnalystEstimate
 * @property {string} symbol
 * @property {string} date              Fiscal year end date
 * @property {number|null} epsAvg
 * @property {number|null} epsHigh
 * @property {number|null} epsLow
 * @property {number|null} revenueAvg
 * @property {number|null} revenueHigh
 * @property {number|null} revenueLow
 * @property {number|null} numAnalystsEps
 * @property {number|null} numAnalystsRevenue
 */

/**
 * @typedef {Object} EarningsResult
 * @property {string} symbol
 * @property {string} date              Earnings date
 * @property {number|null} epsActual
 * @property {number|null} epsEstimated
 * @property {number|null} revenueActual
 * @property {number|null} revenueEstimated
 * @property {number|null} epsSurprisePct   % beat/miss vs estimate
 * @property {string} lastUpdated
 */

/**
 * Fetch analyst price target consensus for a symbol.
 *
 * @param {import('./client.mjs').FmpClient} client
 * @param {string} symbol
 * @returns {Promise<PriceTargetConsensus>}
 */
export async function getPriceTargetConsensus(client, symbol) {
  const data = await client.get("price-target-consensus", {
    symbol: symbol.toUpperCase(),
  });

  const r = (Array.isArray(data) ? data[0] : data) ?? {};

  return {
    symbol: symbol.toUpperCase(),
    targetHigh: r.targetHigh ?? null,
    targetLow: r.targetLow ?? null,
    targetConsensus: r.targetConsensus ?? null,
    targetMedian: r.targetMedian ?? null,
  };
}

/**
 * Fetch forward analyst estimates (annual).
 *
 * Note: quarterly estimates require a paid FMP plan.
 *
 * @param {import('./client.mjs').FmpClient} client
 * @param {string} symbol
 * @param {Object} [options]
 * @param {number} [options.limit=4]
 * @returns {Promise<AnalystEstimate[]>}
 */
export async function getAnalystEstimates(client, symbol, options = {}) {
  const { limit = 4 } = options;

  const data = await client.get("analyst-estimates", {
    symbol: symbol.toUpperCase(),
    period: "annual",
    limit: String(limit),
  });

  return (Array.isArray(data) ? data : []).map((r) => ({
    symbol: r.symbol ?? symbol.toUpperCase(),
    date: r.date ?? null,
    epsAvg: r.epsAvg ?? null,
    epsHigh: r.epsHigh ?? null,
    epsLow: r.epsLow ?? null,
    revenueAvg: r.revenueAvg ?? null,
    revenueHigh: r.revenueHigh ?? null,
    revenueLow: r.revenueLow ?? null,
    numAnalystsEps: r.numAnalystsEps ?? null,
    numAnalystsRevenue: r.numAnalystsRevenue ?? null,
  }));
}

/**
 * Fetch earnings calendar — recent results with actual vs estimated.
 *
 * Without a symbol filter this returns the full calendar (all tickers).
 * Pass symbol to filter to one ticker.
 *
 * @param {import('./client.mjs').FmpClient} client
 * @param {Object} [options]
 * @param {string} [options.symbol]   Filter to one ticker
 * @param {string} [options.from]     YYYY-MM-DD
 * @param {string} [options.to]       YYYY-MM-DD
 * @param {number} [options.limit=10]
 * @returns {Promise<EarningsResult[]>}
 */
export async function getEarningsCalendar(client, options = {}) {
  const { symbol, from, to, limit = 10 } = options;

  const params = { limit: String(limit) };
  if (symbol) params.symbol = symbol.toUpperCase();
  if (from) params.from = from;
  if (to) params.to = to;

  const data = await client.get("earnings-calendar", params);

  return (Array.isArray(data) ? data : []).map((r) => {
    const epsSurprisePct =
      r.epsEstimated && r.epsActual !== null
        ? ((r.epsActual - r.epsEstimated) / Math.abs(r.epsEstimated)) * 100
        : null;

    return {
      symbol: r.symbol ?? null,
      date: r.date ?? null,
      epsActual: r.epsActual ?? null,
      epsEstimated: r.epsEstimated ?? null,
      revenueActual: r.revenueActual ?? null,
      revenueEstimated: r.revenueEstimated ?? null,
      epsSurprisePct: epsSurprisePct !== null ? Math.round(epsSurprisePct * 10) / 10 : null,
      lastUpdated: r.lastUpdated ?? null,
    };
  });
}
