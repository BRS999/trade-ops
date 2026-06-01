/**
 * Massive options data — contracts, snapshots, trades.
 *
 * Endpoint docs: https://massive.com/docs/rest/options
 *
 * Key endpoints:
 *   GET /v3/reference/options/contracts        — list contracts for an underlying
 *   GET /v3/reference/options/contracts/{ticker} — single contract detail
 *   GET /v3/snapshot/options/{underlying}        — option chain snapshot (full Greeks + OI)
 *   GET /v3/trades/{optionsTicker}              — tick-level trades for a contract
 *
 * Plan notes (as of June 2026):
 *   - Option Chain Snapshot: Starter ($29/mo) 15-min delayed, Advanced ($199/mo) real-time
 *   - Trades: Developer ($79/mo) 15-min delayed, Advanced ($199/mo) real-time
 *   - Contracts reference: included in all plans (including free Basic)
 */

// ── Option Contracts ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} OptionContract
 * @property {string} ticker       Massive options ticker, e.g. "O:AAPL260618C00185000"
 * @property {string} underlying   Underlying symbol, e.g. "AAPL"
 * @property {string} type         "call" | "put"
 * @property {string} expiry       Expiration date, e.g. "2026-06-18"
 * @property {number} strike       Strike price in dollars
 * @property {string} exercise     "american" | "european"
 * @property {string|null} shares_per_contract Usually 100
 */

/**
 * Fetch all options contracts for an underlying ticker.
 *
 * Massive contract ticker format: O:{UNDERLYING}{YYMMDD}{C|P}{STRIKE x 1000 padded to 8}
 * Example: O:AAPL260618C00185000 = AAPL 2026-06-18 Call $185.00
 *
 * GET /v3/reference/options/contracts
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} underlying
 * @param {string} [contractType]   "call" | "put" — optional filter
 * @param {string} [asOf]            YYYY-MM-DD — historical contract lookup
 * @param {number} [limit=100]       Max results per page (paginates automatically)
 * @returns {Promise<OptionContract[]>}
 */
export async function getOptionContracts(client, underlying, contractType, asOf, limit = 100) {
  const params = {
    underlying_ticker: underlying.toUpperCase(),
    limit: String(limit),
  };
  if (contractType) params.contract_type = contractType;
  if (asOf) params.as_of = asOf;

  const rows = await client.getAll("/v3/reference/options/contracts", params);
  return rows.map(_parseContract).filter(Boolean);
}

/**
 * Fetch a single options contract by its Massive ticker.
 *
 * GET /v3/reference/options/contracts/{options_ticker}
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} ticker  Massive options ticker, e.g. "O:AAPL260618C00185000"
 * @returns {Promise<OptionContract>}
 */
export async function getOptionContract(client, ticker) {
  const data = await client.get(`/v3/reference/options/contracts/${ticker}`);
  if (!data.results) {
    throw new Error(`Massive: option contract not found: ${ticker}`);
  }
  return _parseContract(data.results);
}

// ── Option Chain Snapshot ────────────────────────────────────────────────────

/**
 * @typedef {Object} OptionSnapshot
 * @property {string} underlying
 * @property {string} contract_type   "call" | "put"
 * @property {string} expiration_date YYYY-MM-DD
 * @property {number} strike_price
 * @property {string} option_ticker   Massive ticker
 * @property {number|null} bid
 * @property {number|null} ask
 * @property {number|null} mid
 * @property {number|null} last_price
 * @property {number|null} volume
 * @property {number|null} open_interest
 * @property {number|null} implied_volatility
 * @property {number|null} delta
 * @property {number|null} gamma
 * @property {number|null} theta
 * @property {number|null} vega
 * @property {number|null} rho
 */

/**
 * @typedef {Object} OptionChainSnapshot
 * @property {string} underlying
 * @property {string} fetched_at     ISO timestamp
 * @property {OptionSnapshot[]} contracts
 */

/**
 * Fetch a full option chain snapshot for an underlying ticker.
 *
 * Returns all contracts (calls + puts, all expiries, all strikes) in a single
 * paginated request. Each contract includes Greeks, IV, quotes, volume, OI.
 *
 * One request per underlying symbol (respects rate limiter).
 *
 * GET /v3/snapshot/options/{underlyingAsset}
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} underlying   e.g. "AAPL", "NVDA"
 * @returns {Promise<OptionChainSnapshot>}
 */
export async function getOptionChainSnapshot(client, underlying) {
  const upper = underlying.toUpperCase();
  // Use client.getAll to handle pagination — some chains have 1000+ contracts
  const params = { limit: "1000" };
  const raw = await client.getAll(`/v3/snapshot/options/${upper}`, params);

  const contracts = [];
  for (const entry of raw) {
    const snap = _parseOptionSnapshot(upper, entry);
    if (snap) contracts.push(snap);
  }

  return {
    underlying: upper,
    fetched_at: new Date().toISOString(),
    contracts,
  };
}

// ── Option Trades ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} OptionTrade
 * @property {string} ticker       Massive options ticker
 * @property {number} price        Trade price
 * @property {number} size         Contracts traded
 * @property {number} timestamp    Unix ms
 * @property {string|null} exchange
 * @property {string|null} conditions
 */

/**
 * Fetch tick-level trades for a specific options contract.
 *
 * GET /v3/trades/{optionsTicker}
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} optionsTicker   Massive options ticker, e.g. "O:AAPL260618C00185000"
 * @param {Object} [opts]
 * @param {string}  [opts.timestamp_gte]  ISO date — start of range
 * @param {string}  [opts.timestamp_lte]  ISO date — end of range
 * @param {number}  [opts.limit=100]      Max trades to return (auto-paginates)
 * @returns {Promise<OptionTrade[]>}
 */
export async function getOptionTrades(client, optionsTicker, opts = {}) {
  const { timestamp_gte, timestamp_lte, limit = 100 } = opts;

  const params = { limit: String(limit) };
  if (timestamp_gte) params.timestamp = timestamp_gte;
  if (timestamp_lte) params.timestamp_gte = timestamp_lte;

  const rows = await client.getAll(`/v3/trades/${optionsTicker}`, params);
  return rows.map((t) => ({
    ticker: optionsTicker,
    price: t.p ?? null,
    size: t.s ?? null,
    timestamp: t.t ?? null,
    exchange: t.x ?? null,
    conditions: cdtToList(t.c) ?? null,
  }));
}

// ── Option Bars (OHLC) ────────────────────────────────────────────────────────

/**
 * @typedef {Object} OptionBar
 * @property {string} ticker
 * @property {number} timestamp    Unix ms
 * @property {number} open
 * @property {number} high
 * @property {number} low
 * @property {number} close
 * @property {number} volume
 */

/**
 * Fetch aggregate OHLCV bars for a specific options contract.
 *
 * Similar to stock bars but for an options ticker. Useful for building
 * historical volume/OI analysis or charting.
 *
 * GET /v3/aggs/ticker/{optionsTicker}/range/{multiplier}/{timespan}/{from}/{to}
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} optionsTicker   Massive options ticker
 * @param {Object} opts
 * @param {string}  opts.from        YYYY-MM-DD
 * @param {string}  opts.to          YYYY-MM-DD
 * @param {number}  [opts.multiplier=1]
 * @param {string}  [opts.timespan='day']  'minute'|'hour'|'day'|'week'|'month'
 * @param {number}  [opts.limit=120]
 * @returns {Promise<OptionBar[]>}
 */
export async function getOptionBars(client, optionsTicker, opts) {
  const {
    from,
    to,
    multiplier = 1,
    timespan = "day",
    limit = 120,
  } = opts;

  if (!from || !to) {
    throw new Error("getOptionBars: 'from' and 'to' (YYYY-MM-DD) are required");
  }

  const data = await client.get(
    `/v3/aggs/ticker/${optionsTicker}/range/${multiplier}/${timespan}/${from}/${to}`,
    { limit: String(limit) }
  );

  const results = data.results ?? [];
  return results.map((bar) => ({
    ticker: optionsTicker,
    timestamp: bar.t,
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
  }));
}

// ── Unusual Options Activity Scanner ──────────────────────────────────────────

/**
 * Scan an option chain for unusual activity signals.
 *
 * Heuristics:
 *   - Volume > Open Interest (new positions being opened)
 *   - Volume >= 2x Open Interest (significantly unusual)
 *   - Large block trades relative to average contract volume
 *   - Far OTM contracts with unusual volume (potential informed flow)
 *
 * @param {import('./client.mjs').MassiveClient} client
 * @param {string} underlying
 * @param {Object} [opts]
 * @param {number} [opts.minVolume=100]        Minimum volume threshold
 * @param {number} [opts.oiMultiplier=2]       Volume/OI ratio threshold
 * @returns {Promise<{ underlying: string, unusual: OptionSnapshot[], total_contracts: number }>}
 */
export async function scanUnusualOptions(client, underlying, opts = {}) {
  const { minVolume = 100, oiMultiplier = 2 } = opts;

  const chain = await getOptionChainSnapshot(client, underlying);
  const unusual = chain.contracts.filter((c) => {
    if ((c.volume ?? 0) < minVolume) return false;
    const oi = c.open_interest ?? 0;
    if (oi === 0) return (c.volume ?? 0) >= minVolume; // No OI but volume exists = new
    return (c.volume ?? 0) >= oiMultiplier * oi;
  });

  // Sort by volume/OI ratio descending
  unusual.sort((a, b) => {
    const ratioA = (a.volume ?? 0) / Math.max(a.open_interest ?? 1, 1);
    const ratioB = (b.volume ?? 0) / Math.max(b.open_interest ?? 1, 1);
    return ratioB - ratioA;
  });

  return {
    underlying: chain.underlying,
    unusual,
    total_contracts: chain.contracts.length,
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _parseContract(raw) {
  if (!raw) return null;

  return {
    ticker: raw.ticker ?? null,
    underlying: raw.underlying_ticker ?? null,
    type: raw.contract_type ?? null,
    expiry: raw.expiration_date ?? null,
    strike: raw.strike_price ?? null,
    exercise: raw.exercise_style ?? null,
    shares_per_contract: raw.shares_per_contract ?? null,
  };
}

function _parseOptionSnapshot(underlying, raw) {
  if (!raw) return null;

  const details = raw.details ?? {};
  const quote = raw.quote ?? {};
  const day = raw.day ?? {};
  const greeks = raw.greeks ?? {};

  const bid = quote.bp ?? null;
  const ask = quote.ap ?? null;
  const mid = (bid != null && ask != null) ? Number(((bid + ask) / 2).toFixed(4)) : null;

  return {
    underlying,
    contract_type: details.contract_type ?? null,
    expiration_date: details.expiration_date ?? null,
    strike_price: details.strike_price ?? null,
    option_ticker: details.ticker ?? null,
    bid,
    ask,
    mid,
    last_price: day.c ?? null,
    volume: day.v ?? null,
    open_interest: raw.open_interest ?? null,
    implied_volatility: raw.implied_volatility ?? null,
    delta: greeks.delta ?? null,
    gamma: greeks.gamma ?? null,
    theta: greeks.theta ?? null,
    vega: greeks.vega ?? null,
    rho: greeks.rho ?? null,
  };
}

function cdtToList(conditions) {
  if (!conditions) return null;
  if (typeof conditions === "string") return conditions;
  if (Array.isArray(conditions)) return conditions.join(",");
  return String(conditions);
}
