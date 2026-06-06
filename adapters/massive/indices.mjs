/**
 * Massive indices data — aggregates and snapshots.
 *
 * Endpoint docs: https://massive.com/docs/rest/indices
 *
 * Key endpoints:
 *   GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}
 *   GET /v3/snapshot/indices
 *
 * Ticker format: I:{INDEX}  e.g. "I:SPX", "I:NDX", "I:DJI", "I:VIX"
 *
 * Plan notes: index aggregates and snapshots are entitlement-gated on the
 * current account.
 */

// ── Aggregate Bars (OHLCV) ────────────────────────────────────────────────────

/**
 * @typedef {Object} IndexBar
 * @property {string} ticker       e.g. "I:SPX"
 * @property {number} timestamp    Unix ms
 * @property {number|null} open
 * @property {number|null} high
 * @property {number|null} low
 * @property {number|null} close
 * @property {number|null} volume
 */

/**
 * Fetch aggregate OHLCV bars for an index.
 *
 * Common tickers: I:SPX (S&P 500), I:NDX (Nasdaq 100), I:DJI (Dow Jones),
 * I:RUT (Russell 2000), I:VIX (CBOE Volatility Index).
 *
 * GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}
 *
 * Note: Some indices like I:VIX are derived and may not have OHLC bars.
 * Use the snapshot endpoint for latest values.
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker  e.g. "I:SPX"
 * @param {Object} opts
 * @param {string}  opts.from         YYYY-MM-DD
 * @param {string}  opts.to           YYYY-MM-DD
 * @param {number}  [opts.multiplier=1]
 * @param {string}  [opts.timespan='day']  'minute'|'hour'|'day'|'week'|'month'
 * @param {string}  [opts.sort='asc']
 * @param {number}  [opts.limit=5000]
 * @returns {Promise<IndexBar[]>}
 */
export async function getIndexBars(client, ticker, opts) {
  const {
    from,
    to,
    multiplier = 1,
    timespan = "day",
    sort = "asc",
    limit = 5000,
  } = opts;

  if (!from || !to) {
    throw new Error("getIndexBars: 'from' and 'to' (YYYY-MM-DD) are required");
  }

  const data = await client.get(
    `/v2/aggs/ticker/${ticker.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}`,
    { sort, limit: String(limit) }
  );

  const results = data.results ?? [];
  return results.map((bar) => ({
    ticker: ticker.toUpperCase(),
    timestamp: bar.t,
    open: bar.o ?? null,
    high: bar.h ?? null,
    low: bar.l ?? null,
    close: bar.c ?? null,
    volume: bar.v ?? null,
  }));
}

// ── Snapshot ──────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} IndexSnapshot
 * @property {string|null} ticker       e.g. "I:SPX"
 * @property {string|null} name         e.g. "S&P 500"
 * @property {number|null} last_price
 * @property {number|null} open
 * @property {number|null} high
 * @property {number|null} low
 * @property {number|null} close
 * @property {number|null} volume
 * @property {number|null} change_pct
 * @property {number|null} change
 */

/**
 * Fetch snapshots for market indices.
 *
 * GET /v3/snapshot/indices
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} [opts]
 * @param {string}  [opts.ticker]   filter to specific index, e.g. "I:SPX"
 * @param {number}  [opts.limit=100]
 * @param {string}  [opts.sort]
 * @returns {Promise<IndexSnapshot[]>}
 */
export async function getIndexSnapshots(client, opts = {}) {
  const { ticker, limit = 100, sort } = opts;
  const params = { limit: String(limit) };
  if (ticker) params.ticker = ticker.toUpperCase();
  if (sort) params.sort = sort;

  const data = await client.get("/v3/snapshot/indices", params);
  const list = data.results ?? data.snapshots ?? (Array.isArray(data) ? data : []);
  return list.map(_parseIndexSnapshot).filter(Boolean);
}

/**
 * Convenience: fetch the "Big 4" US indices in one call.
 *
 * Gets current snapshots for SPX, NDX, DJI, and VIX.
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @returns {Promise<IndexSnapshot[]>}
 */
export async function getMajorIndices(client) {
  return getIndexSnapshots(client, {
    ticker: "I:SPX",
    limit: 10,
  });
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _parseIndexSnapshot(raw) {
  if (!raw) return null;

  const day = raw.day ?? raw.session ?? {};

  return {
    ticker: raw.ticker ?? null,
    name: raw.name ?? raw.index_name ?? null,
    last_price: day.c ?? day.close ?? raw.last_price ?? raw.value ?? null,
    open: day.o ?? day.open ?? null,
    high: day.h ?? day.high ?? null,
    low: day.l ?? day.low ?? null,
    close: day.c ?? day.close ?? null,
    volume: day.v ?? day.volume ?? null,
    change_pct: raw.todays_change_perc ?? raw.change_pct ?? day.change_percent ?? null,
    change: raw.todays_change ?? raw.change ?? day.change ?? null,
  };
}
