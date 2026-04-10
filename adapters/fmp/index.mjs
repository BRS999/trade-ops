/**
 * FMP (Financial Modeling Prep) adapter — public API.
 *
 * Usage:
 *   import { FmpClient, getAnalystSummary } from './adapters/fmp/index.mjs';
 *   const client = new FmpClient();  // reads FMP_API_KEY from env
 *   const summary = await getAnalystSummary(client, 'AAPL');
 *
 * Free tier covers:
 *   - Price target consensus (high/low/median/consensus)
 *   - Annual forward EPS + revenue estimates
 *   - Earnings calendar (actual vs estimated)
 *
 * Quarterly estimates require a paid plan.
 */

export { FmpClient, FmpError } from "./client.mjs";
export { getPriceTargetConsensus, getAnalystEstimates, getEarningsCalendar } from "./analyst.mjs";

import { getPriceTargetConsensus, getAnalystEstimates } from "./analyst.mjs";

/**
 * Fetch a combined analyst summary for a single ticker.
 * One call returns price targets + nearest forward estimates.
 *
 * @param {import('./client.mjs').FmpClient} client
 * @param {string} symbol
 * @returns {Promise<Object>}
 *
 * @example
 * {
 *   symbol: 'AAPL',
 *   price_target: { consensus: 316.67, median: 325, high: 350, low: 239 },
 *   estimates: [
 *     { date: '2026-09-27', epsAvg: 9.12, revenueAvg: 415000000000, numAnalystsEps: 28 },
 *     ...
 *   ]
 * }
 */
export async function getAnalystSummary(client, symbol) {
  const [targets, estimates] = await Promise.all([
    getPriceTargetConsensus(client, symbol),
    getAnalystEstimates(client, symbol, { limit: 3 }),
  ]);

  return {
    symbol: symbol.toUpperCase(),
    price_target: {
      consensus: targets.targetConsensus,
      median: targets.targetMedian,
      high: targets.targetHigh,
      low: targets.targetLow,
    },
    estimates: estimates.map((e) => ({
      date: e.date,
      epsAvg: e.epsAvg,
      epsHigh: e.epsHigh,
      epsLow: e.epsLow,
      revenueAvg: e.revenueAvg,
      numAnalystsEps: e.numAnalystsEps,
      numAnalystsRevenue: e.numAnalystsRevenue,
    })),
  };
}
