/**
 * Massive market data — market status, holidays, snapshots, related companies.
 *
 * Endpoint docs: https://massive.com/docs/rest/reference
 *
 * Key endpoints:
 *   GET /v1/marketstatus/now          — current US market status
 *   GET /v1/marketstatus/upcoming     — upcoming market holidays
 *   GET /v3/snapshot                  — universal snapshot (stocks, options, indices)
 *   GET /v1/related-companies/{ticker} — related/competitor companies
 *
 * Plan notes: market status, holidays, and related companies are available on
 * the current account. Universal snapshots are entitlement-gated.
 */

// ── Market Status ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} MarketStatus
 * @property {string|null} market         "extended_hours" | "pre_market" | "regular" | "post_market" | "closed"
 * @property {string|null} early_hours     early trading session status
 * @property {boolean|null} isOpen         whether the market is currently open
 * @property {string|null} next_open       ISO timestamp of next market open
 * @property {string|null} next_close      ISO timestamp of next market close
 * @property {string|null} updated_at      ISO timestamp
 */

/**
 * Fetch current US stock market status.
 *
 * Tells you whether the market is open, in pre-market, extended hours, or closed.
 *
 * GET /v1/marketstatus/now
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @returns {Promise<MarketStatus>}
 */
export async function getMarketStatus(client) {
  const data = await client.get("/v1/marketstatus/now");
  return _parseMarketStatus(data);
}

// ── Market Holidays ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} MarketHoliday
 * @property {string|null} date           YYYY-MM-DD
 * @property {string|null} name           e.g. "Thanksgiving Day"
 * @property {string|null} status         "early_close" | "closed"
 * @property {string|null} open_time      ISO timestamp (if early close)
 * @property {string|null} close_time     ISO timestamp (if early close)
 */

/**
 * Fetch upcoming US market holidays.
 *
 * Returns holidays for the current calendar year.
 *
 * GET /v1/marketstatus/upcoming
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @returns {Promise<MarketHoliday[]>}
 */
export async function getMarketHolidays(client) {
  const data = await client.get("/v1/marketstatus/upcoming");
  const list = Array.isArray(data) ? data : (data.results ?? []);
  return list.map(_parseHoliday).filter(Boolean);
}

// ── Universal Snapshot ───────────────────────────────────────────────────────

/**
 * @typedef {Object} UniversalSnapshot
 * @property {string|null} ticker
 * @property {string|null} type            "stocks" | "options" | "indices" | "forex" | "crypto"
 * @property {number|null} last_price
 * @property {number|null} bid
 * @property {number|null} ask
 * @property {number|null} mid
 * @property {number|null} open
 * @property {number|null} high
 * @property {number|null} low
 * @property {number|null} close
 * @property {number|null} volume
 * @property {number|null} change_pct
 * @property {number|null} change
 */

/**
 * Fetch universal snapshot for any ticker type.
 *
 * Supports stocks, options, indices, forex, and crypto tickers.
 * Use the `type` parameter to filter results.
 *
 * GET /v3/snapshot
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {Object} [opts]
 * @param {string}  [opts.ticker]    single ticker, e.g. "AAPL"
 * @param {string}  [opts.type]      "stocks" | "options" | "indices" | "forex" | "crypto"
 * @param {number}  [opts.limit=100]
 * @param {string}  [opts.sort]
 * @returns {Promise<UniversalSnapshot[]>}
 */
export async function getUniversalSnapshot(client, opts = {}) {
  const { ticker, type, limit = 100, sort } = opts;
  const params = { limit: String(limit) };
  if (ticker) params.ticker = ticker.toUpperCase();
  if (type) params.type = type;
  if (sort) params.sort = sort;

  const data = await client.get("/v3/snapshot", params);
  const list = data.results ?? data.snapshots ?? (Array.isArray(data) ? data : []);
  return list.map(_parseUniversalSnapshot).filter(Boolean);
}

// ── Related Companies ───────────────────────────────────────────────────────

/**
 * @typedef {Object} RelatedCompany
 * @property {string|null} ticker
 * @property {string|null} name
 * @property {string|null} sector
 * @property {string|null} industry
 * @property {number|null} market_cap
 */

/**
 * Fetch related/competitor companies for a given ticker.
 *
 * GET /v1/related-companies/{ticker}
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker  e.g. "AAPL"
 * @returns {Promise<RelatedCompany[]>}
 */
export async function getRelatedCompanies(client, ticker) {
  const data = await client.get(`/v1/related-companies/${ticker.toUpperCase()}`);
  const list = data.results ?? (Array.isArray(data) ? data : []);
  return list.map(_parseRelatedCompany).filter(Boolean);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _parseMarketStatus(raw) {
  if (!raw) return {};
  return {
    market: raw.market ?? raw.status ?? null,
    early_hours: raw.early_hours ?? raw.earlyHours ?? null,
    isOpen: raw.is_open ?? raw.isOpen ?? null,
    next_open: raw.next_open ?? raw.nextOpen ?? null,
    next_close: raw.next_close ?? raw.nextClose ?? null,
    updated_at: raw.updated_at ?? raw.updatedAt ?? null,
  };
}

function _parseHoliday(raw) {
  if (!raw) return null;
  return {
    date: raw.date ?? null,
    name: raw.name ?? raw.holiday ?? null,
    status: raw.status ?? null,
    open_time: raw.open_time ?? raw.openTime ?? null,
    close_time: raw.close_time ?? raw.closeTime ?? null,
  };
}

function _parseUniversalSnapshot(raw) {
  if (!raw) return null;

  const quote = raw.quote ?? {};
  const day = raw.day ?? {};
  const bid = quote.bp ?? null;
  const ask = quote.ap ?? null;

  return {
    ticker: raw.ticker ?? null,
    type: raw.type ?? null,
    last_price: day.c ?? raw.last_price ?? null,
    bid,
    ask,
    mid: (bid != null && ask != null)
      ? Number(((bid + ask) / 2).toFixed(4))
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

function _parseRelatedCompany(raw) {
  if (!raw) return null;
  return {
    ticker: raw.ticker ?? null,
    name: raw.name ?? raw.company_name ?? null,
    sector: raw.sector ?? null,
    industry: raw.industry ?? null,
    market_cap: raw.market_cap ?? raw.marketCap ?? null,
  };
}
