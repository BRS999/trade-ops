/**
 * Massive economic data — Federal Reserve economic indicators.
 *
 * Endpoint docs: https://massive.com/docs/rest/fed
 *
 * Key endpoints:
 *   GET /fed/v1/inflation              — CPI, PCE, core inflation readings
 *   GET /fed/v1/inflation-expectations — market-based inflation expectations
 *   GET /fed/v1/labor-market           — unemployment, participation, earnings, JOLTS
 *   GET /fed/v1/treasury-yields         — Treasury yields across maturities
 *
 * Plan notes: included in all plans (including free Basic).
 *
 * Query parameters (all endpoints):
 *   date       — exact date filter (YYYY-MM-DD)
 *   date.gte   — on or after
 *   date.lte   — on or before
 *   date.gt    — after
 *   date.lt    — before
 *   date.any_of — comma-separated dates
 *   limit      — max results (default 10, max 1000)
 *   sort       — sort field, e.g. "date", "-date" (desc)
 */

// ── Inflation ─────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} InflationReading
 * @property {string|null} date           YYYY-MM-DD
 * @property {string|null} indicator     e.g. "CPI", "Core CPI", "PCE", "Core PCE"
 * @property {number|null} value         reading value (percent or index)
 * @property {number|null} year_over_year  YoY change (percent)
 * @property {number|null} month_over_month  MoM change (percent)
 * @property {string|null} source        e.g. "BLS", "BEA"
 * @property {string|null} release_time  ISO timestamp
 */

/**
 * Fetch Federal Reserve inflation data (CPI, PCE, core measures).
 *
 * Sources: Bureau of Labor Statistics (CPI), Bureau of Economic Analysis (PCE).
 *
 * GET /fed/v1/inflation
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} [opts]
 * @param {string}  [opts.date]        exact date (YYYY-MM-DD)
 * @param {string}  [opts.from]        alias for date.gte
 * @param {string}  [opts.to]          alias for date.lte
 * @param {number}  [opts.limit=100]
 * @param {string}  [opts.sort]        e.g. "-date" for descending
 * @returns {Promise<InflationReading[]>}
 */
export async function getInflation(client, opts = {}) {
  const { date, from, to, limit = 100, sort } = opts;
  const params = { limit: String(limit) };
  if (date) params.date = date;
  if (from) params["date.gte"] = from;
  if (to) params["date.lte"] = to;
  if (sort) params.sort = sort;

  const rows = await client.getAll("/fed/v1/inflation", params);
  return rows.map(_parseInflation).filter(Boolean);
}

// ── Inflation Expectations ───────────────────────────────────────────────────

/**
 * @typedef {Object} InflationExpectation
 * @property {string|null} date           YYYY-MM-DD
 * @property {string|null} indicator     e.g. "T5YIE", "T10YIE" (breakeven rates)
 * @property {string|null} maturity      e.g. "5Y", "10Y"
 * @property {number|null} value         breakeven rate (percent)
 * @property {string|null} source        e.g. "FRED", "TIPS"
 */

/**
 * Fetch market-based inflation expectations (TIPS breakeven rates).
 *
 * GET /fed/v1/inflation-expectations
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} [opts]
 * @param {string}  [opts.date]        exact date (YYYY-MM-DD)
 * @param {string}  [opts.from]        alias for date.gte
 * @param {string}  [opts.to]          alias for date.lte
 * @param {number}  [opts.limit=100]
 * @param {string}  [opts.sort]
 * @returns {Promise<InflationExpectation[]>}
 */
export async function getInflationExpectations(client, opts = {}) {
  const { date, from, to, limit = 100, sort } = opts;
  const params = { limit: String(limit) };
  if (date) params.date = date;
  if (from) params["date.gte"] = from;
  if (to) params["date.lte"] = to;
  if (sort) params.sort = sort;

  const rows = await client.getAll("/fed/v1/inflation-expectations", params);
  return rows.map(_parseInflationExpect).filter(Boolean);
}

// ── Labor Market ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} LaborMarketReading
 * @property {string|null} date              YYYY-MM-DD
 * @property {string|null} indicator        e.g. "UnemploymentRate", "LFPR", "NonfarmPayrolls"
 * @property {number|null} value            reading value
 * @property {number|null} change           period-over-period change
 * @property {number|null} change_percent   period-over-period percent change
 * @property {string|null} source           e.g. "BLS", "JOLTS"
 * @property {string|null} release_time     ISO timestamp
 */

/**
 * Fetch Federal Reserve labor market indicators.
 *
 * Indicators include: Unemployment Rate, Labor Force Participation Rate,
 * Average Hourly Earnings, Nonfarm Payrolls, JOLTS Job Openings, Quits Rate.
 *
 * GET /fed/v1/labor-market
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} [opts]
 * @param {string}  [opts.date]        exact date (YYYY-MM-DD)
 * @param {string}  [opts.from]        alias for date.gte
 * @param {string}  [opts.to]          alias for date.lte
 * @param {number}  [opts.limit=100]
 * @param {string}  [opts.sort]
 * @returns {Promise<LaborMarketReading[]>}
 */
export async function getLaborMarket(client, opts = {}) {
  const { date, from, to, limit = 100, sort } = opts;
  const params = { limit: String(limit) };
  if (date) params.date = date;
  if (from) params["date.gte"] = from;
  if (to) params["date.lte"] = to;
  if (sort) params.sort = sort;

  const rows = await client.getAll("/fed/v1/labor-market", params);
  return rows.map(_parseLaborMarket).filter(Boolean);
}

// ── Treasury Yields ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} TreasuryYield
 * @property {string|null} date           YYYY-MM-DD
 * @property {string|null} maturity      e.g. "1M", "3M", "6M", "1Y", "2Y", "5Y", "10Y", "30Y"
 * @property {number|null} yield         yield as percent (e.g. 4.52)
 * @property {number|null} change        daily change (bps)
 * @property {string|null} source        e.g. "UST"
 */

/**
 * Fetch U.S. Treasury yield curve data across maturities.
 *
 * Maturities: 1-month, 3-month, 6-month, 1-year, 2-year, 3-year,
 * 5-year, 7-year, 10-year, 20-year, 30-year.
 *
 * Useful for yield curve analysis, recession signals (10Y-2Y spread),
 * and rate expectations.
 *
 * GET /fed/v1/treasury-yields
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} [opts]
 * @param {string}  [opts.date]        exact date (YYYY-MM-DD)
 * @param {string}  [opts.from]        alias for date.gte
 * @param {string}  [opts.to]          alias for date.lte
 * @param {string}  [opts.maturity]    specific maturity filter, e.g. "10Y"
 * @param {number}  [opts.limit=100]
 * @param {string}  [opts.sort]
 * @returns {Promise<TreasuryYield[]>}
 */
export async function getTreasuryYields(client, opts = {}) {
  const { date, from, to, maturity, limit = 100, sort } = opts;
  const params = { limit: String(limit) };
  if (date) params.date = date;
  if (from) params["date.gte"] = from;
  if (to) params["date.lte"] = to;
  if (maturity) params.maturity = maturity;
  if (sort) params.sort = sort;

  const rows = await client.getAll("/fed/v1/treasury-yields", params);
  return rows.map(_parseTreasuryYield).filter(Boolean);
}

/**
 * Fetch the current yield curve and compute common spreads.
 *
 * Computes: 10Y-2Y spread (recession indicator), 10Y-3M spread.
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} [date]  YYYY-MM-DD (defaults to latest)
 * @returns {Promise<{ date: string, yields: TreasuryYield[], spreads: Object }>}
 */
export async function getYieldCurve(client, date) {
  const opts = { date, limit: 50 };
  const yields = await getTreasuryYields(client, opts);

  if (yields.length === 0) {
    return { date: date ?? null, yields: [], spreads: {} };
  }

  const latestDate = yields[0].date;
  const byMaturity = {};
  for (const y of yields) {
    if (y.date === latestDate) byMaturity[y.maturity] = y.yield;
  }

  const spreads = {};
  if (byMaturity["10Y"] != null && byMaturity["2Y"] != null) {
    spreads["10Y-2Y"] = Number((byMaturity["10Y"] - byMaturity["2Y"]).toFixed(2));
  }
  if (byMaturity["10Y"] != null && byMaturity["3M"] != null) {
    spreads["10Y-3M"] = Number((byMaturity["10Y"] - byMaturity["3M"]).toFixed(2));
  }

  return { date: latestDate, yields, spreads };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _parseInflation(raw) {
  if (!raw) return null;
  return {
    date: raw.date ?? null,
    indicator: raw.indicator ?? raw.name ?? null,
    value: raw.value ?? null,
    year_over_year: raw.year_over_yoy ?? raw.yoy ?? raw.change_yoy ?? null,
    month_over_month: raw.month_over_month ?? raw.mom ?? raw.change_mom ?? null,
    source: raw.source ?? null,
    release_time: raw.release_time ?? raw.timestamp ?? null,
  };
}

function _parseInflationExpect(raw) {
  if (!raw) return null;
  return {
    date: raw.date ?? null,
    indicator: raw.indicator ?? raw.series ?? null,
    maturity: raw.maturity ?? null,
    value: raw.value ?? null,
    source: raw.source ?? null,
  };
}

function _parseLaborMarket(raw) {
  if (!raw) return null;
  return {
    date: raw.date ?? null,
    indicator: raw.indicator ?? raw.name ?? null,
    value: raw.value ?? null,
    change: raw.change ?? raw.change_value ?? null,
    change_percent: raw.change_percent ?? raw.change_pct ?? null,
    source: raw.source ?? null,
    release_time: raw.release_time ?? raw.timestamp ?? null,
  };
}

function _parseTreasuryYield(raw) {
  if (!raw) return null;
  return {
    date: raw.date ?? null,
    maturity: raw.maturity ?? null,
    yield: raw.yield ?? raw.rates ?? null,
    change: raw.change ?? null,
    source: raw.source ?? null,
  };
}
