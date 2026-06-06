/**
 * Massive stocks extras — short interest, short volume, dividends, splits.
 *
 * Endpoint docs: https://massive.com/docs/rest/stocks
 *
 * Key endpoints:
 *   GET /stocks/v1/short-interest — short interest by ticker/date
 *   GET /stocks/v1/short-volume   — daily short volume and short volume ratio
 *   GET /stocks/v1/dividends      — dividend declarations and ex-dates
 *   GET /stocks/v1/splits         — stock splits and adjustment factors
 *
 * Plan notes: included in all plans (including free Basic).
 */

// ── Short Interest ───────────────────────────────────────────────────────────

/**
 * @typedef {Object} ShortInterest
 * @property {string|null} ticker           e.g. "GME"
 * @property {string|null} settlement_date  YYYY-MM-DD (bi-monthly)
 * @property {number|null} short_interest   number of shares short
 * @property {number|null} avg_daily_volume average daily volume
 * @property {number|null} days_to_cover    short interest / avg volume ratio
 * @property {number|null} change           change from prior period
 */

/**
 * Fetch short interest data for stocks.
 *
 * Short interest is reported bi-monthly by exchanges.
 * days_to_cover = short_interest / avg_daily_volume (a high ratio can signal squeeze potential).
 *
 * GET /stocks/v1/short-interest
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} [opts]
 * @param {string}  [opts.ticker]          single ticker, e.g. "GME"
 * @param {string}  [opts.settlement_date] YYYY-MM-DD filter
 * @param {string}  [opts.from]            settlement_date.gte
 * @param {string}  [opts.to]              settlement_date.lte
 * @param {number}  [opts.limit=100]
 * @param {string}  [opts.sort]            e.g. "-settlement_date", "-days_to_cover"
 * @returns {Promise<ShortInterest[]>}
 */
export async function getShortInterest(client, opts = {}) {
  const { ticker, settlement_date, from, to, limit = 100, sort } = opts;
  const params = { limit: String(limit) };
  if (ticker) params.ticker = ticker.toUpperCase();
  if (settlement_date) params.settlement_date = settlement_date;
  if (from) params["settlement_date.gte"] = from;
  if (to) params["settlement_date.lte"] = to;
  if (sort) params.sort = sort;

  const rows = await client.getAll("/stocks/v1/short-interest", params);
  return rows.map(_parseShortInterest).filter(Boolean);
}

/**
 * Convenience: get latest short interest for a single ticker.
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker  e.g. "GME"
 * @returns {Promise<ShortInterest|null>}
 */
export async function getLatestShortInterest(client, ticker) {
  const rows = await getShortInterest(client, {
    ticker,
    sort: "-settlement_date",
    limit: 1,
  });
  return rows[0] ?? null;
}

// ── Short Volume ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ShortVolume
 * @property {string|null} ticker           e.g. "AAPL"
 * @property {string|null} date             YYYY-MM-DD
 * @property {number|null} short_volume     shares sold short
 * @property {number|null} total_volume     total daily volume
 * @property {number|null} short_volume_ratio  short_volume / total_volume (0-1)
 */

/**
 * Fetch daily short volume data.
 *
 * Short volume ratio > 0.5 suggests heavy short selling activity.
 * Data is provided by FINRA and other exchanges.
 *
 * GET /stocks/v1/short-volume
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} [opts]
 * @param {string}  [opts.ticker]   single ticker, e.g. "GME"
 * @param {string}  [opts.date]     YYYY-MM-DD filter
 * @param {string}  [opts.from]     date.gte
 * @param {string}  [opts.to]       date.lte
 * @param {number}  [opts.limit=100]
 * @param {string}  [opts.sort]     e.g. "-date"
 * @returns {Promise<ShortVolume[]>}
 */
export async function getShortVolume(client, opts = {}) {
  const { ticker, date, from, to, limit = 100, sort } = opts;
  const params = { limit: String(limit) };
  if (ticker) params.ticker = ticker.toUpperCase();
  if (date) params.date = date;
  if (from) params["date.gte"] = from;
  if (to) params["date.lte"] = to;
  if (sort) params.sort = sort;

  const rows = await client.getAll("/stocks/v1/short-volume", params);
  return rows.map(_parseShortVolume).filter(Boolean);
}

// ── Dividends ────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Dividend
 * @property {string|null} ticker           e.g. "AAPL"
 * @property {string|null} ex_dividend_date YYYY-MM-DD
 * @property {string|null} record_date      YYYY-MM-DD
 * @property {string|null} pay_date         YYYY-MM-DD
 * @property {number|null} amount           dividend per share ($)
 * @property {string|null} currency         e.g. "USD"
 * @property {number|null} frequency        dividends per year (1=annual, 4=quarterly, 12=monthly)
 * @property {string|null} distribution_type "ordinary" | "special" | "return_of_capital"
 */

/**
 * Fetch dividend declarations for stocks.
 *
 * GET /stocks/v1/dividends
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} [opts]
 * @param {string}  [opts.ticker]           single ticker
 * @param {string}  [opts.from]             ex_dividend_date.gte
 * @param {string}  [opts.to]               ex_dividend_date.lte
 * @param {string}  [opts.distribution_type] "ordinary" | "special" | "return_of_capital"
 * @param {number}  [opts.limit=100]
 * @param {string}  [opts.sort]             e.g. "-ex_dividend_date"
 * @returns {Promise<Dividend[]>}
 */
export async function getDividends(client, opts = {}) {
  const { ticker, from, to, distribution_type, limit = 100, sort } = opts;
  const params = { limit: String(limit) };
  if (ticker) params.ticker = ticker.toUpperCase();
  if (from) params["ex_dividend_date.gte"] = from;
  if (to) params["ex_dividend_date.lte"] = to;
  if (distribution_type) params.distribution_type = distribution_type;
  if (sort) params.sort = sort;

  const rows = await client.getAll("/stocks/v1/dividends", params);
  return rows.map(_parseDividend).filter(Boolean);
}

// ── Splits ───────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} StockSplit
 * @property {string|null} ticker           e.g. "TSLA"
 * @property {string|null} execution_date   YYYY-MM-DD
 * @property {number|null} split_from       shares before (e.g. 1)
 * @property {number|null} split_to         shares after (e.g. 3)
 * @property {number|null} ratio            split_to / split_from
 * @property {string|null} adjustment_type  "split" | "reverse_split" | "dividend"
 */

/**
 * Fetch stock split history.
 *
 * GET /stocks/v1/splits
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} [opts]
 * @param {string}  [opts.ticker]         single ticker
 * @param {string}  [opts.from]           execution_date.gte
 * @param {string}  [opts.to]             execution_date.lte
 * @param {number}  [opts.limit=100]
 * @param {string}  [opts.sort]           e.g. "-execution_date"
 * @returns {Promise<StockSplit[]>}
 */
export async function getSplits(client, opts = {}) {
  const { ticker, from, to, limit = 100, sort } = opts;
  const params = { limit: String(limit) };
  if (ticker) params.ticker = ticker.toUpperCase();
  if (from) params["execution_date.gte"] = from;
  if (to) params["execution_date.lte"] = to;
  if (sort) params.sort = sort;

  const rows = await client.getAll("/stocks/v1/splits", params);
  return rows.map(_parseSplit).filter(Boolean);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _parseShortInterest(raw) {
  if (!raw) return null;
  return {
    ticker: raw.ticker ?? null,
    settlement_date: raw.settlement_date ?? null,
    short_interest: raw.short_interest ?? raw.shortInterest ?? null,
    avg_daily_volume: raw.avg_daily_volume ?? raw.avgDailyVolume ?? null,
    days_to_cover: raw.days_to_cover ?? raw.daysToCover ?? null,
    change: raw.change ?? null,
  };
}

function _parseShortVolume(raw) {
  if (!raw) return null;
  const sv = raw.short_volume ?? raw.shortVolume ?? null;
  const tv = raw.total_volume ?? raw.totalVolume ?? null;
  const ratio = raw.short_volume_ratio ?? raw.shortVolumeRatio ?? null;
  return {
    ticker: raw.ticker ?? null,
    date: raw.date ?? null,
    short_volume: sv,
    total_volume: tv,
    short_volume_ratio: ratio ?? (
      sv != null && tv != null && tv > 0
        ? Number((sv / tv).toFixed(4))
        : null
    ),
  };
}

function _parseDividend(raw) {
  if (!raw) return null;
  return {
    ticker: raw.ticker ?? null,
    ex_dividend_date: raw.ex_dividend_date ?? raw.exDividendDate ?? null,
    record_date: raw.record_date ?? raw.recordDate ?? null,
    pay_date: raw.pay_date ?? raw.payDate ?? null,
    amount: raw.amount ?? raw.cash_amount ?? null,
    currency: raw.currency ?? "USD",
    frequency: raw.frequency ?? null,
    distribution_type: raw.distribution_type ?? raw.distributionType ?? null,
  };
}

function _parseSplit(raw) {
  if (!raw) return null;
  const from = raw.split_from ?? raw.splitFrom ?? null;
  const to = raw.split_to ?? raw.splitTo ?? null;
  return {
    ticker: raw.ticker ?? null,
    execution_date: raw.execution_date ?? raw.executionDate ?? null,
    split_from: from,
    split_to: to,
    ratio: (from != null && to != null && from > 0)
      ? Number((to / from).toFixed(2))
      : null,
    adjustment_type: raw.adjustment_type ?? raw.adjustmentType ?? "split",
  };
}
