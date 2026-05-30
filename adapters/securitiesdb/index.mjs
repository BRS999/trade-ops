/**
 * SecuritiesDB adapter — public API.
 *
 * Primary use cases:
 *   - SEC Form 4 insider transactions: who's buying/selling and how much
 *   - Net buy/sell ratio: aggregate insider conviction signal
 *   - 13F smart-money flow: what Citadel, RenTech, Bridgewater, Soros,
 *     Millennium, Point72, Two Sigma, DE Shaw are doing in a stock
 *
 * No API key required.
 */

export { SecuritiesDbClient, SecuritiesDbError } from "./client.mjs";

/**
 * Raw insider activity response for a ticker.
 * Contains both insider_transactions and institutional_flow.
 *
 * @param {string} symbol  Ticker symbol, e.g. "PLTR"
 */
export function getInsiderActivity(client, symbol) {
  return client.get(`stocks/${symbol.toUpperCase()}/insider-activity`);
}

/**
 * SEC Form 4 insider transactions only.
 * Returns count, net buy/sell ratio, total values, and recent transactions.
 *
 * @param {string} symbol
 */
export async function getInsiderTransactions(client, symbol) {
  const { data, meta } = await getInsiderActivity(client, symbol);
  return {
    ticker: data.ticker,
    as_of: meta.timestamp_utc,
    freshness_hours: meta.data_freshness_hours,
    ...data.insider_transactions,
  };
}

/**
 * 13F smart-money institutional flow.
 * Returns recent position changes from major hedge funds.
 *
 * @param {string} symbol
 */
export async function getInstitutionalFlow(client, symbol) {
  const { data, meta } = await getInsiderActivity(client, symbol);
  const flow = data.institutional_flow ?? [];

  // Summarise by fund — dedupe to latest action per fund
  const byFund = new Map();
  for (const entry of flow) {
    const existing = byFund.get(entry.fund);
    if (!existing || entry.quarter > existing.quarter) {
      byFund.set(entry.fund, entry);
    }
  }

  const latest = [...byFund.values()].sort((a, b) =>
    b.quarter.localeCompare(a.quarter),
  );

  const buyers = latest.filter((f) => f.shares_change > 0);
  const sellers = latest.filter((f) => f.shares_change < 0);
  const exited = latest.filter((f) => f.action === "Exited");

  return {
    ticker: data.ticker,
    as_of: meta.timestamp_utc,
    total_flow_entries: flow.length,
    unique_funds: latest.length,
    net_buyers: buyers.length,
    net_sellers: sellers.length,
    exited: exited.length,
    flow: latest,
    raw: flow,
  };
}

/**
 * Combined snapshot: insider buy/sell conviction + smart-money 13F flow.
 *
 * @param {string} symbol
 */
export async function getSmartMoneySnapshot(client, symbol) {
  const { data, meta } = await getInsiderActivity(client, symbol);
  const flow = data.institutional_flow ?? [];

  const byFund = new Map();
  for (const entry of flow) {
    const existing = byFund.get(entry.fund);
    if (!existing || entry.quarter > existing.quarter) {
      byFund.set(entry.fund, entry);
    }
  }
  const latestFlow = [...byFund.values()].sort((a, b) =>
    b.quarter.localeCompare(a.quarter),
  );

  const ins = data.insider_transactions;

  return {
    ticker: data.ticker,
    as_of: meta.timestamp_utc,
    freshness_hours: meta.data_freshness_hours,
    insider: {
      transaction_count: ins.count,
      net_buy_sell_ratio: ins.net_buy_sell_ratio,
      total_buy_value: ins.total_buy_value,
      total_sell_value: ins.total_sell_value,
      recent: ins.recent,
    },
    institutional: {
      unique_funds: latestFlow.length,
      buyers: latestFlow.filter((f) => f.shares_change > 0).length,
      sellers: latestFlow.filter((f) => f.shares_change < 0).length,
      exited: latestFlow.filter((f) => f.action === "Exited").length,
      flow: latestFlow,
    },
  };
}
