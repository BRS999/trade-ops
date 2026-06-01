/**
 * Massive futures data — contracts, products, snapshots, trades, bars.
 *
 * Endpoint docs: https://massive.com/docs/rest/futures
 *
 * Key endpoints:
 *   GET /futures/v1/contracts         — list futures contracts (all products or by product code)
 *   GET /futures/v1/contracts/{ticker} — single contract detail
 *   GET /futures/v1/products          — list futures products (codes, names, exchanges)
 *   GET /futures/v1/products/{code}    — single product detail
 *   GET /futures/v1/schedule          — trading schedule for a contract date range
 *   GET /futures/v1/snapshot          — real-time snapshot (trade, quote, session OHLCV)
 *   GET /futures/v1/aggs/{ticker}     — aggregate OHLCV bars
 *   GET /futures/v1/trades/{ticker}   — tick-level trades
 *
 * Plan notes (as of June 2026):
 *   - Contracts, Products, Schedules, Aggregate Bars: all plans (including free Basic)
 *   - Snapshot: Starter ($29/mo) 10-min delayed, Advanced ($199/mo) real-time
 *   - Trades: Developer ($79/mo) 10-min delayed, Advanced ($199/mo) real-time
 *
 * Ticker format: {PRODUCT_CODE}{MONTH_CODE}{YY}
 *   e.g. ESZ24 = S&P 500 E-mini, December 2024
 *   Month codes: F=Jan, G=Feb, H=Mar, J=Apr, K=May, M=Jun,
 *                N=Jul, Q=Aug, U=Sep, V=Oct, X=Nov, Z=Dec
 */

// ── Contracts ────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} FuturesContract
 * @property {string} ticker            e.g. "ESZ24"
 * @property {string} product_code      e.g. "ES"
 * @property {string} product_name      e.g. "E-mini S&P 500"
 * @property {string} exchange          e.g. "CME"
 * @property {string|null} first_trade_date  YYYY-MM-DD
 * @property {string|null} last_trade_date   YYYY-MM-DD
 * @property {number|null} days_to_maturity
 * @property {boolean} active
 */

/**
 * List futures contracts, optionally filtered by product.
 *
 * GET /futures/v1/contracts
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} [opts]
 * @param {string}  [opts.product_code]  e.g. "ES", "GC", "CL"
 * @param {boolean} [opts.active=true]  filter to active contracts only
 * @param {string}  [opts.as_of]         YYYY-MM-DD historical lookup
 * @param {number}  [opts.limit=100]
 * @returns {Promise<FuturesContract[]>}
 */
export async function getFuturesContracts(client, opts = {}) {
  const { product_code, active = true, as_of, limit = 100 } = opts;
  const params = {
    active: String(active),
    limit: String(limit),
  };
  if (product_code) params.product_code = product_code.toUpperCase();
  if (as_of) params.as_of = as_of;

  const rows = await client.getAll("/futures/v1/contracts", params);
  return rows.map(_parseContract).filter(Boolean);
}

/**
 * Fetch a single futures contract by ticker.
 *
 * GET /futures/v1/contracts/{ticker}
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker  e.g. "ESZ24"
 * @returns {Promise<FuturesContract>}
 */
export async function getFuturesContract(client, ticker) {
  const data = await client.get(`/futures/v1/contracts/${ticker.toUpperCase()}`);
  if (!data.results) {
    throw new Error(`Massive: futures contract not found: ${ticker}`);
  }
  return _parseContract(data.results);
}

// ── Products ─────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} FuturesProduct
 * @property {string} code              e.g. "ES"
 * @property {string} name              e.g. "E-mini S&P 500"
 * @property {string} exchange          e.g. "CME"
 * @property {string|null} sector
 * @property {string|null} asset_class
 * @property {string|null} product_type
 * @property {string|null} settlement_type
 * @property {string|null} tick_size
 * @property {string|null} price_quotation
 */

/**
 * List all available futures products.
 *
 * GET /futures/v1/products
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} [opts]
 * @param {string} [opts.exchange]   e.g. "CME", "NYMEX", "COMEX", "CBOT"
 * @param {string} [opts.sector]     e.g. "Equities", "Energy", "Metals"
 * @param {string}  [opts.as_of]      YYYY-MM-DD historical lookup
 * @param {number}  [opts.limit=100]
 * @returns {Promise<FuturesProduct[]>}
 */
export async function getFuturesProducts(client, opts = {}) {
  const { exchange, sector, as_of, limit = 100 } = opts;
  const params = { limit: String(limit) };
  if (exchange) params.exchange = exchange.toUpperCase();
  if (sector) params.sector = sector;
  if (as_of) params.as_of = as_of;

  const rows = await client.getAll("/futures/v1/products", params);
  return rows.map(_parseProduct).filter(Boolean);
}

// ── Trading Schedules ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} TradingSchedule
 * @property {string} date              YYYY-MM-DD
 * @property {string|null} status      "open" | "closed"
 * @property {string|null} open_time    ISO timestamp
 * @property {string|null} close_time   ISO timestamp
 * @property {string|null} product_code
 */

/**
 * Fetch trading schedules for futures products over a date range.
 *
 * GET /futures/v1/schedule
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} opts
 * @param {string} opts.from           YYYY-MM-DD
 * @param {string} opts.to             YYYY-MM-DD
 * @param {string} [opts.product_code] filter by product
 * @param {number} [opts.limit=100]
 * @returns {Promise<TradingSchedule[]>}
 */
export async function getFuturesSchedule(client, opts) {
  const { from, to, product_code, limit = 100 } = opts;
  if (!from || !to) {
    throw new Error("getFuturesSchedule: 'from' and 'to' (YYYY-MM-DD) are required");
  }

  const params = { from, to, limit: String(limit) };
  if (product_code) params.product_code = product_code.toUpperCase();

  const rows = await client.getAll("/futures/v1/schedule", params);
  return rows.map(_parseSchedule).filter(Boolean);
}

// ── Snapshots ─────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} FuturesSnapshot
 * @property {string} ticker
 * @property {string|null} product_code
 * @property {number|null} last_price
 * @property {number|null} bid
 * @property {number|null} ask
 * @property {number|null} mid
 * @property {number|null} open
 * @property {number|null} high
 * @property {number|null} low
 * @property {number|null} close
 * @property {number|null} volume
 * @property {number|null} open_interest
 * @property {number|null} settlement_price
 * @property {number|null} change_pct
 */

/**
 * Fetch real-time or delayed snapshots for futures contracts.
 *
 * Can query by ticker (comma-separated for multiple) or by product_code
 * to get all active contracts for a product.
 *
 * GET /futures/v1/snapshot
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} opts
 * @param {string} [opts.ticker]        comma-separated, e.g. "ESZ24,GCZ24"
 * @param {string} [opts.product_code]  e.g. "ES" — returns all active contracts
 * @param {string} [opts.sort]          sort field
 * @param {number} [opts.limit=100]
 * @returns {Promise<FuturesSnapshot[]>}
 */
export async function getFuturesSnapshots(client, opts = {}) {
  const { ticker, product_code, sort, limit = 100 } = opts;
  const params = { limit: String(limit) };
  if (ticker) params.ticker = ticker.toUpperCase();
  if (product_code) params.product_code = product_code.toUpperCase();
  if (sort) params.sort = sort;

  const data = await client.get("/futures/v1/snapshot", params);
  const list = data.results ?? data.snapshots ?? (Array.isArray(data) ? data : []);
  return list.map(_parseSnapshot).filter(Boolean);
}

// ── Aggregate Bars (OHLCV) ────────────────────────────────────────────────────

/**
 * @typedef {Object} FuturesBar
 * @property {string} ticker
 * @property {number} timestamp    Unix ms (start of bar, CT)
 * @property {number|null} open
 * @property {number|null} high
 * @property {number|null} low
 * @property {number|null} close
 * @property {number|null} volume
 */

/**
 * Fetch aggregate OHLCV bars for a futures contract.
 *
 * GET /futures/v1/aggs/{ticker}
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker  e.g. "ESZ24"
 * @param {Object} opts
 * @param {string}  opts.from         YYYY-MM-DD
 * @param {string}  opts.to           YYYY-MM-DD
 * @param {number}  [opts.multiplier=1]
 * @param {string}  [opts.timespan='day']  'minute'|'hour'|'day'|'week'|'month'
 * @param {string}  [opts.sort='asc']     'asc'|'desc'
 * @param {number}  [opts.limit=5000]
 * @returns {Promise<FuturesBar[]>}
 */
export async function getFuturesBars(client, ticker, opts) {
  const {
    from,
    to,
    multiplier = 1,
    timespan = "day",
    sort = "asc",
    limit = 5000,
  } = opts;

  if (!from || !to) {
    throw new Error("getFuturesBars: 'from' and 'to' (YYYY-MM-DD) are required");
  }

  const data = await client.get(
    `/futures/v1/aggs/${ticker.toUpperCase()}`,
    {
      multiplier: String(multiplier),
      timespan,
      from,
      to,
      sort,
      limit: String(limit),
    }
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

// ── Trades ─────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} FuturesTrade
 * @property {string} ticker
 * @property {number|null} price
 * @property {number|null} size
 * @property {number|null} timestamp    Unix ns (nanoseconds — Massive futures trades)
 * @property {string|null} exchange
 * @property {string|null} conditions
 */

/**
 * Fetch tick-level trades for a futures contract.
 *
 * GET /futures/v1/trades/{ticker}
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker  e.g. "ESZ24"
 * @param {Object} [opts]
 * @param {string} [opts.timestamp_gte]  ISO date — start of range
 * @param {string} [opts.timestamp_lte]  ISO date — end of range
 * @param {number} [opts.limit=100]
 * @returns {Promise<FuturesTrade[]>}
 */
export async function getFuturesTrades(client, ticker, opts = {}) {
  const { timestamp_gte, timestamp_lte, limit = 100 } = opts;

  const params = { limit: String(limit) };
  if (timestamp_gte) params.timestamp_gte = timestamp_gte;
  if (timestamp_lte) params.timestamp_lte = timestamp_lte;

  const rows = await client.getAll(`/futures/v1/trades/${ticker.toUpperCase()}`, params);
  return rows.map((t) => ({
    ticker: ticker.toUpperCase(),
    price: t.p ?? null,
    size: t.s ?? null,
    timestamp: t.t ?? null,
    exchange: t.x ?? null,
    conditions: t.c ?? null,
  }));
}

// ── Front Contract Helper ─────────────────────────────────────────────────────

/**
 * Get the front (nearest-expiry) active contract for a product.
 *
 * Fetches active contracts sorted by last_trade_date ascending and picks
 * the first one — this is the nearest-expiry (front) contract.
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} product_code  e.g. "ES", "GC", "CL"
 * @returns {Promise<FuturesContract>}
 */
export async function getFrontContract(client, product_code) {
  const contracts = await getFuturesContracts(client, {
    product_code,
    active: true,
    limit: 20,
  });
  if (contracts.length === 0) {
    throw new Error(`Massive: no active contracts for product: ${product_code}`);
  }
  // Sort by last_trade_date ascending — nearest expiry first
  contracts.sort((a, b) => {
    if (!a.last_trade_date) return 1;
    if (!b.last_trade_date) return -1;
    return a.last_trade_date.localeCompare(b.last_trade_date);
  });
  return contracts[0];
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _parseContract(raw) {
  if (!raw) return null;
  return {
    ticker: raw.ticker ?? null,
    product_code: raw.product_code ?? null,
    product_name: raw.name ?? null,
    exchange: raw.exchange ?? null,
    first_trade_date: raw.first_trade_date ?? raw.firstTradeDate ?? null,
    last_trade_date: raw.last_trade_date ?? raw.lastTradeDate ?? null,
    days_to_maturity: raw.days_to_maturity ?? raw.daysToMaturity ?? null,
    active: raw.active ?? false,
  };
}

function _parseProduct(raw) {
  if (!raw) return null;
  return {
    code: raw.code ?? raw.product_code ?? null,
    name: raw.name ?? null,
    exchange: raw.exchange ?? null,
    sector: raw.sector ?? null,
    asset_class: raw.asset_class ?? raw.assetClass ?? null,
    product_type: raw.product_type ?? raw.productType ?? null,
    settlement_type: raw.settlement_type ?? raw.settlementType ?? null,
    tick_size: raw.tick_size ?? raw.tickSize ?? null,
    price_quotation: raw.price_quotation ?? raw.priceQuotation ?? null,
  };
}

function _parseSchedule(raw) {
  if (!raw) return null;
  return {
    date: raw.date ?? null,
    status: raw.status ?? null,
    open_time: raw.open_time ?? raw.openTime ?? null,
    close_time: raw.close_time ?? raw.closeTime ?? null,
    product_code: raw.product_code ?? raw.productCode ?? null,
  };
}

function _parseSnapshot(raw) {
  if (!raw) return null;

  const details = raw.details ?? {};
  const quote = raw.quote ?? {};
  const day = raw.day ?? {};

  const bid = quote.bp ?? null;
  const ask = quote.ap ?? null;
  const mid = (bid != null && ask != null)
    ? Number(((bid + ask) / 2).toFixed(4))
    : null;

  return {
    ticker: raw.ticker ?? null,
    product_code: details.product_code ?? raw.product_code ?? null,
    last_price: day.c ?? raw.last_price ?? null,
    bid,
    ask,
    mid,
    open: day.o ?? null,
    high: day.h ?? null,
    low: day.l ?? null,
    close: day.c ?? null,
    volume: day.v ?? null,
    open_interest: raw.open_interest ?? day.oi ?? null,
    settlement_price: raw.settlement_price ?? raw.lp ?? null,
    change_pct: raw.todays_change_perc ?? raw.change_pct ?? null,
  };
}
