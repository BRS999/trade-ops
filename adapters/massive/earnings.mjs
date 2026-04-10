/**
 * Massive earnings data.
 *
 * NOTE: Massive's earnings calendar is limited — it only provides EPS estimates
 * and actuals for past quarters via the /vX/reference/financials endpoint, which
 * is Stocks Developer tier+. There is no reliable forward earnings date endpoint
 * in the free or Starter tiers.
 *
 * For forward earnings dates, the practical options are:
 *   - earningswhispers.com (scrape or paid API)
 *   - Alpha Vantage EARNINGS_CALENDAR endpoint (free key, CSV)
 *   - store earnings_date manually in watchlists/active.json (current approach)
 *
 * This module provides what Massive *does* offer:
 *   getFinancials(client, ticker, options) — past quarterly EPS/revenue from filings
 */

/**
 * @typedef {Object} FinancialResult
 * @property {string} ticker
 * @property {string} fiscal_period       e.g. 'Q1', 'Q2', 'FY'
 * @property {string} fiscal_year         e.g. '2024'
 * @property {string} start_date          YYYY-MM-DD
 * @property {string} end_date            YYYY-MM-DD
 * @property {string} filing_date         YYYY-MM-DD
 * @property {number|null} revenues
 * @property {number|null} net_income
 * @property {number|null} basic_eps
 * @property {number|null} diluted_eps
 */

/**
 * @typedef {Object} FinancialsOptions
 * @property {string}  [period_of_report_date]  YYYY-MM-DD, filter by report date
 * @property {string}  [timeframe='quarterly']  'annual' | 'quarterly' | 'ttm'
 * @property {number}  [limit=4]                Number of periods to return
 * @property {string}  [sort='period_of_report_date']
 * @property {string}  [order='desc']           'asc' | 'desc'
 */

/**
 * Fetch historical financial results (past filings).
 *
 * Requires Stocks Developer plan or above.
 *
 * Massive endpoint:
 *   GET /vX/reference/financials?ticker={ticker}
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker
 * @param {FinancialsOptions} options
 * @returns {Promise<FinancialResult[]>}
 */
export async function getFinancials(client, ticker, options = {}) {
  const {
    timeframe = "quarterly",
    limit = 4,
    sort = "period_of_report_date",
    order = "desc",
  } = options;

  const data = await client.get("/vX/reference/financials", {
    ticker: ticker.toUpperCase(),
    timeframe,
    limit: String(limit),
    sort,
    order,
  });

  const results = data.results ?? [];

  return results.map((r) => {
    const income = r.financials?.income_statement ?? {};
    return {
      ticker: ticker.toUpperCase(),
      fiscal_period: r.fiscal_period ?? null,
      fiscal_year: r.fiscal_year ?? null,
      start_date: r.start_date ?? null,
      end_date: r.end_date ?? null,
      filing_date: r.filing_date ?? null,
      revenues: income.revenues?.value ?? null,
      net_income: income.net_income_loss?.value ?? null,
      basic_eps: income.basic_earnings_per_share?.value ?? null,
      diluted_eps: income.diluted_earnings_per_share?.value ?? null,
    };
  });
}
