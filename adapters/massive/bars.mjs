/**
 * Massive historical OHLCV bars (aggregates).
 *
 * getBars(client, ticker, options)  → array of OHLCV bars
 *
 * Options:
 *   multiplier   {number}  Bar size multiplier, default 1
 *   timespan     {string}  'minute' | 'hour' | 'day' | 'week' | 'month', default 'day'
 *   from         {string}  YYYY-MM-DD start date (inclusive)
 *   to           {string}  YYYY-MM-DD end date (inclusive)
 *   limit        {number}  Max bars to return, default 120 (Massive max per page: 50000)
 *   adjusted     {boolean} Split/dividend adjusted, default true
 *   sort         {string}  'asc' | 'desc', default 'asc'
 */

/**
 * @typedef {Object} Bar
 * @property {string} ticker
 * @property {number} timestamp   Unix ms (start of bar)
 * @property {number} open
 * @property {number} high
 * @property {number} low
 * @property {number} close
 * @property {number} volume
 * @property {number|null} vwap
 * @property {number|null} transactions
 */

/**
 * @typedef {Object} BarsOptions
 * @property {number}  [multiplier=1]
 * @property {string}  [timespan='day']
 * @property {string}  from             YYYY-MM-DD
 * @property {string}  to               YYYY-MM-DD
 * @property {number}  [limit=120]
 * @property {boolean} [adjusted=true]
 * @property {string}  [sort='asc']
 */

/**
 * Fetch historical OHLCV bars for a ticker.
 *
 * Massive endpoint:
 *   GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker
 * @param {BarsOptions} options
 * @returns {Promise<Bar[]>}
 */
export async function getBars(client, ticker, options = {}) {
  const {
    multiplier = 1,
    timespan = "day",
    from,
    to,
    limit = 120,
    adjusted = true,
    sort = "asc",
  } = options;

  if (!from || !to) {
    throw new Error("getBars: 'from' and 'to' (YYYY-MM-DD) are required");
  }

  const upper = ticker.toUpperCase();
  const path = `/v2/aggs/ticker/${upper}/range/${multiplier}/${timespan}/${from}/${to}`;

  const data = await client.get(path, {
    adjusted: String(adjusted),
    sort,
    limit: String(limit),
  });

  const results = data.results ?? [];
  return results.map((bar) => ({
    ticker: upper,
    timestamp: bar.t,
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
    vwap: bar.vw ?? null,
    transactions: bar.n ?? null,
  }));
}

/**
 * Fetch all bars across pagination for the given range (handles next_url).
 *
 * Same options as getBars but ignores the limit option (fetches everything).
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker
 * @param {BarsOptions} options
 * @returns {Promise<Bar[]>}
 */
export async function getAllBars(client, ticker, options = {}) {
  const {
    multiplier = 1,
    timespan = "day",
    from,
    to,
    adjusted = true,
    sort = "asc",
  } = options;

  if (!from || !to) {
    throw new Error("getAllBars: 'from' and 'to' (YYYY-MM-DD) are required");
  }

  const upper = ticker.toUpperCase();
  const path = `/v2/aggs/ticker/${upper}/range/${multiplier}/${timespan}/${from}/${to}`;

  const raw = await client.getAll(path, {
    adjusted: String(adjusted),
    sort,
    limit: "50000",
  });

  return raw.map((bar) => ({
    ticker: upper,
    timestamp: bar.t,
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
    vwap: bar.vw ?? null,
    transactions: bar.n ?? null,
  }));
}
