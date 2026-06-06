/**
 * Massive crypto data — aggregates, snapshots, trades.
 *
 * Endpoint docs: https://massive.com/docs/rest/crypto
 *
 * Key endpoints:
 *   GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}
 *   GET /v2/snapshot/locale/global/markets/crypto/tickers
 *   GET /v2/snapshot/locale/global/markets/crypto/tickers/{ticker}
 *   GET /v3/trades/{ticker}
 *
 * Ticker format: X:{SYMBOL}USD  e.g. "X:BTCUSD", "X:ETHUSD"
 * Snapshot list format: BTC-USD, ETH-USD
 *
 * Plan notes:
 *   - Aggregates: available on the current account
 *   - Snapshots/trades: entitlement-gated on the current account
 */

// ── Aggregate Bars (OHLCV) ────────────────────────────────────────────────────

/**
 * @typedef {Object} CryptoBar
 * @property {string} ticker
 * @property {number} timestamp    Unix ms
 * @property {number|null} open
 * @property {number|null} high
 * @property {number|null} low
 * @property {number|null} close
 * @property {number|null} volume
 */

/**
 * Fetch aggregate OHLCV bars for a crypto pair.
 *
 * Ticker format: X:BTCUSD, X:ETHUSD, X:SOLUSD
 *
 * GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker  e.g. "X:BTCUSD"
 * @param {Object} opts
 * @param {string}  opts.from         YYYY-MM-DD
 * @param {string}  opts.to           YYYY-MM-DD
 * @param {number}  [opts.multiplier=1]
 * @param {string}  [opts.timespan='day']  'minute'|'hour'|'day'|'week'|'month'
 * @param {string}  [opts.sort='asc']
 * @param {number}  [opts.limit=5000]
 * @returns {Promise<CryptoBar[]>}
 */
export async function getCryptoBars(client, ticker, opts) {
  const {
    from,
    to,
    multiplier = 1,
    timespan = "day",
    sort = "asc",
    limit = 5000,
  } = opts;

  if (!from || !to) {
    throw new Error("getCryptoBars: 'from' and 'to' (YYYY-MM-DD) are required");
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
 * @typedef {Object} CryptoSnapshot
 * @property {string|null} ticker          e.g. "X:BTCUSD"
 * @property {string|null} name
 * @property {number|null} last_price
 * @property {number|null} bid
 * @property {number|null} ask
 * @property {number|null} open
 * @property {number|null} high
 * @property {number|null} low
 * @property {number|null} close
 * @property {number|null} volume
 * @property {number|null} change_pct
 * @property {number|null} change
 */

/**
 * Fetch snapshot for all crypto tickers in the market.
 *
 * GET /v2/snapshot/locale/global/markets/crypto/tickers
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} [opts]
 * @param {number} [opts.limit=100]
 * @param {string} [opts.sort]
 * @returns {Promise<CryptoSnapshot[]>}
 */
export async function getCryptoSnapshots(client, opts = {}) {
  const { limit = 100, sort } = opts;
  const params = { limit: String(limit) };
  if (sort) params.sort = sort;

  const data = await client.get("/v2/snapshot/locale/global/markets/crypto/tickers", params);
  const list = data.tickers ?? data.results ?? (Array.isArray(data) ? data : []);
  return list.map(_parseCryptoSnapshot).filter(Boolean);
}

/**
 * Fetch snapshot for a single crypto ticker.
 *
 * GET /v2/snapshot/locale/global/markets/crypto/tickers/{ticker}
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker  e.g. "BTC-USD" or "X:BTCUSD"
 * @returns {Promise<CryptoSnapshot>}
 */
export async function getCryptoTickerSnapshot(client, ticker) {
  const data = await client.get(
    `/v2/snapshot/locale/global/markets/crypto/tickers/${ticker.toUpperCase()}`
  );
  return _parseCryptoSnapshot(data.ticker ?? data.results ?? data);
}

// ── Trades ─────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} CryptoTrade
 * @property {string} ticker
 * @property {number|null} price
 * @property {number|null} size
 * @property {number|null} timestamp    Unix ms
 * @property {string|null} exchange
 */

/**
 * Fetch recent trades for a crypto pair.
 *
 * GET /v3/trades/{ticker}
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker  e.g. "X:BTCUSD"
 * @param {Object} [opts]
 * @param {string} [opts.timestamp_gte]  ISO date — start of range
 * @param {string} [opts.timestamp_lte]  ISO date — end of range
 * @param {number} [opts.limit=100]
 * @returns {Promise<CryptoTrade[]>}
 */
export async function getCryptoTrades(client, ticker, opts = {}) {
  const { timestamp_gte, timestamp_lte, limit = 100 } = opts;
  const params = { limit: String(limit) };
  if (timestamp_gte) params.timestamp_gte = timestamp_gte;
  if (timestamp_lte) params.timestamp_lte = timestamp_lte;

  const rows = await client.getAll(`/v3/trades/${ticker.toUpperCase()}`, params);
  return rows.map((t) => ({
    ticker: ticker.toUpperCase(),
    price: t.p ?? null,
    size: t.s ?? null,
    timestamp: t.t ?? null,
    exchange: t.x ?? null,
  }));
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _parseCryptoSnapshot(raw) {
  if (!raw) return null;

  const quote = raw.quote ?? {};
  const day = raw.day ?? {};
  const bid = quote.bp ?? null;
  const ask = quote.ap ?? null;

  return {
    ticker: raw.ticker ?? null,
    name: raw.name ?? null,
    last_price: day.c ?? raw.last_price ?? null,
    bid,
    ask,
    mid: (bid != null && ask != null)
      ? Number(((bid + ask) / 2).toFixed(2))
      : null,
    open: day.o ?? null,
    high: day.h ?? null,
    low: day.l ?? null,
    close: day.c ?? null,
    volume: day.v ?? null,
    change_pct: raw.todays_change_perc ?? raw.change_pct ?? null,
    change: raw.todays_change ?? raw.change ?? null,
  };
}
