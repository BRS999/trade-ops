/**
 * Massive forex data — aggregates, quotes, snapshots.
 *
 * Endpoint docs: https://massive.com/docs/rest/forex
 *
 * Key endpoints:
 *   GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}
 *   GET /v1/last_quote/currencies/{from}/{to}
 *   GET /v2/snapshot/locale/global/markets/forex/tickers
 *
 * Ticker format: C:{BASE}{QUOTE}  e.g. "C:EURUSD", "C:GBPUSD", "C:USDJPY"
 *
 * Plan notes: aggregate bars are available on the current account; quotes and
 * snapshots are entitlement-gated on the current account.
 */

// ── Aggregate Bars (OHLCV) ────────────────────────────────────────────────────

/**
 * @typedef {Object} ForexBar
 * @property {string} ticker       e.g. "C:EURUSD"
 * @property {number} timestamp    Unix ms
 * @property {number|null} open
 * @property {number|null} high
 * @property {number|null} low
 * @property {number|null} close
 * @property {number|null} volume
 */

/**
 * Fetch aggregate OHLCV bars for a forex pair.
 *
 * GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker  e.g. "C:EURUSD"
 * @param {Object} opts
 * @param {string}  opts.from         YYYY-MM-DD
 * @param {string}  opts.to           YYYY-MM-DD
 * @param {number}  [opts.multiplier=1]
 * @param {string}  [opts.timespan='day']  'minute'|'hour'|'day'|'week'|'month'
 * @param {string}  [opts.sort='asc']
 * @param {number}  [opts.limit=5000]
 * @returns {Promise<ForexBar[]>}
 */
export async function getForexBars(client, ticker, opts) {
  const {
    from,
    to,
    multiplier = 1,
    timespan = "day",
    sort = "asc",
    limit = 5000,
  } = opts;

  if (!from || !to) {
    throw new Error("getForexBars: 'from' and 'to' (YYYY-MM-DD) are required");
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

// ── Quotes ───────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ForexQuote
 * @property {string|null} ticker       e.g. "C:EURUSD"
 * @property {number|null} bid
 * @property {number|null} ask
 * @property {number|null} mid
 * @property {number|null} spread      ask - bid (the pip spread)
 * @property {number|null} timestamp   Unix ms
 */

/**
 * Fetch NBBO quote for a forex pair.
 *
 * GET /v1/last_quote/currencies/{from}/{to}
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker  e.g. "C:EURUSD"
 * @returns {Promise<ForexQuote>}
 */
export async function getForexQuote(client, ticker) {
  const { from, to } = _parseForexPair(ticker);
  const data = await client.get(`/v1/last_quote/currencies/${from}/${to}`);
  const quote = data.last ?? data.results ?? data;
  if (!quote) {
    throw new Error(`Massive: forex quote not found: ${ticker}`);
  }
  return _parseForexQuote(ticker, quote);
}

// ── Snapshot ──────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ForexSnapshot
 * @property {string|null} ticker       e.g. "C:EURUSD"
 * @property {number|null} last_price   last trade / midpoint
 * @property {number|null} bid
 * @property {number|null} ask
 * @property {number|null} open
 * @property {number|null} high
 * @property {number|null} low
 * @property {number|null} close
 * @property {number|null} change_pct
 * @property {number|null} change
 */

/**
 * Fetch snapshots for forex tickers.
 *
 * GET /v2/snapshot/locale/global/markets/forex/tickers
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} [opts]
 * @param {string}  [opts.ticker]   filter to specific pair
 * @param {number}  [opts.limit=100]
 * @param {string}  [opts.sort]
 * @returns {Promise<ForexSnapshot[]>}
 */
export async function getForexSnapshots(client, opts = {}) {
  const { ticker, limit = 100, sort } = opts;
  const params = { limit: String(limit) };
  if (ticker) params.ticker = ticker.toUpperCase();
  if (sort) params.sort = sort;

  const data = await client.get("/v2/snapshot/locale/global/markets/forex/tickers", params);
  const list = data.tickers ?? data.results ?? (Array.isArray(data) ? data : []);
  return list.map(_parseForexSnapshot).filter(Boolean);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _parseForexQuote(ticker, raw) {
  const bid = raw.bid ?? raw.bid_price ?? raw.bp ?? null;
  const ask = raw.ask ?? raw.ask_price ?? raw.ap ?? null;
  return {
    ticker: ticker.toUpperCase(),
    bid,
    ask,
    mid: (bid != null && ask != null)
      ? Number(((bid + ask) / 2).toFixed(6))
      : null,
    spread: (bid != null && ask != null)
      ? Number((ask - bid).toFixed(6))
      : null,
    timestamp: raw.t ?? raw.timestamp ?? raw.participant_timestamp ?? null,
  };
}

function _parseForexPair(ticker) {
  const normalized = ticker.toUpperCase().replace(/^C:/, "").replace("-", "");
  if (normalized.length !== 6) {
    throw new Error(`Massive: unsupported forex ticker format: ${ticker}`);
  }
  return {
    from: normalized.slice(0, 3),
    to: normalized.slice(3),
  };
}

function _parseForexSnapshot(raw) {
  if (!raw) return null;

  const quote = raw.quote ?? {};
  const day = raw.day ?? {};
  const bid = quote.bp ?? null;
  const ask = quote.ap ?? null;

  return {
    ticker: raw.ticker ?? null,
    last_price: day.c ?? raw.last_price ?? null,
    bid,
    ask,
    mid: (bid != null && ask != null)
      ? Number(((bid + ask) / 2).toFixed(6))
      : null,
    open: day.o ?? null,
    high: day.h ?? null,
    low: day.l ?? null,
    close: day.c ?? null,
    change_pct: raw.todays_change_perc ?? raw.change_pct ?? null,
    change: raw.todays_change ?? raw.change ?? null,
  };
}
