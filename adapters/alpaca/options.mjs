/**
 * Alpaca options functions — chain, snapshots, Greeks, IV, expected move.
 *
 * Free tier via Alpaca's market data API. Uses the v1beta1/options endpoints.
 * Greeks and implied volatility are included in every snapshot.
 *
 * Endpoint base: https://data.alpaca.markets/v1beta1/options
 */

/**
 * Fetch options snapshots (IV + Greeks + quotes + bars) for a symbol.
 *
 * Snapshots are the primary entry point — they include everything you need
 * to assess an options position without separate requests per contract.
 *
 * @param {import('./client.mjs').AlpacaClient} client
 * @param {string} underlying               e.g. "SOFI"
 * @param {Object} [opts]
 * @param {'call'|'put'}  [opts.type]            filter by contract type
 * @param {number}        [opts.strike_gte]       min strike price
 * @param {number}        [opts.strike_lte]       max strike price
 * @param {string}        [opts.expiry_gte]       ISO date — earliest expiry
 * @param {string}        [opts.expiry_lte]       ISO date — latest expiry
 * @param {number}        [opts.limit=100]
 * @returns {Promise<OptionSnapshot[]>}
 */
export async function getOptionSnapshots(client, underlying, opts = {}) {
  const {
    type,
    strike_gte,
    strike_lte,
    expiry_gte,
    expiry_lte,
    limit = 100,
  } = opts;

  const params = { feed: "indicative", limit };
  if (type)       params.type                = type;
  if (strike_gte) params.strike_price_gte    = strike_gte;
  if (strike_lte) params.strike_price_lte    = strike_lte;
  if (expiry_gte) params.expiration_date_gte = expiry_gte;
  if (expiry_lte) params.expiration_date_lte = expiry_lte;

  const data = await client.request(
    "GET",
    `/v1beta1/options/snapshots/${underlying.toUpperCase()}`,
    { params, base: "data" }
  );

  return Object.entries(data?.snapshots ?? {}).map(([ticker, s]) =>
    _parseSnapshot(ticker, s)
  );
}

/**
 * Full options chain for a symbol — calls and puts across all expiries.
 *
 * Paginates automatically until the full chain is retrieved.
 * Filter by expiry range to keep response sizes manageable.
 *
 * @param {import('./client.mjs').AlpacaClient} client
 * @param {string} underlying
 * @param {Object} [opts]
 * @param {string} [opts.expiry_gte]   ISO date — default today
 * @param {string} [opts.expiry_lte]   ISO date — default +60 days
 * @param {number} [opts.strike_gte]
 * @param {number} [opts.strike_lte]
 * @returns {Promise<{ calls: OptionSnapshot[], puts: OptionSnapshot[] }>}
 */
export async function getOptionChain(client, underlying, opts = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const plus60 = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const {
    expiry_gte = today,
    expiry_lte = plus60,
    strike_gte,
    strike_lte,
  } = opts;

  const params = {
    feed:                 "indicative",
    limit:                100,
    expiration_date_gte:  expiry_gte,
    expiration_date_lte:  expiry_lte,
  };
  if (strike_gte) params.strike_price_gte = strike_gte;
  if (strike_lte) params.strike_price_lte = strike_lte;

  // Paginate through all contracts
  const allSnapshots = [];
  let nextToken = null;

  do {
    if (nextToken) params.page_token = nextToken;
    const data = await client.request(
      "GET",
      `/v1beta1/options/snapshots/${underlying.toUpperCase()}`,
      { params, base: "data" }
    );
    const entries = Object.entries(data?.snapshots ?? {});
    allSnapshots.push(...entries.map(([ticker, s]) => _parseSnapshot(ticker, s)));
    nextToken = data?.next_page_token ?? null;
  } while (nextToken);

  return {
    calls: allSnapshots.filter(s => s.type === "call").sort((a, b) => a.strike - b.strike || a.expiry.localeCompare(b.expiry)),
    puts:  allSnapshots.filter(s => s.type === "put").sort((a, b) => a.strike - b.strike || a.expiry.localeCompare(b.expiry)),
  };
}

/**
 * Compute the expected move for a symbol from the ATM straddle price.
 *
 * Expected move = (ATM call price + ATM put price) for the target expiry.
 * This is what the options market implies the stock will move ± before expiry.
 *
 * @param {import('./client.mjs').AlpacaClient} client
 * @param {string} underlying
 * @param {number} spotPrice          current stock price
 * @param {string} expiry             ISO date e.g. "2026-06-20"
 * @returns {Promise<ExpectedMove>}
 */
export async function getExpectedMove(client, underlying, spotPrice, expiry) {
  // Fetch a narrow band around spot to find ATM contracts
  const band = spotPrice * 0.05; // ±5%
  const snapshots = await getOptionSnapshots(client, underlying, {
    expiry_gte:  expiry,
    expiry_lte:  expiry,
    strike_gte:  spotPrice - band,
    strike_lte:  spotPrice + band,
  });

  // Find the closest strike to spot for calls and puts
  const calls = snapshots.filter(s => s.type === "call");
  const puts  = snapshots.filter(s => s.type === "put");

  const closest = (contracts) =>
    contracts.sort((a, b) => Math.abs(a.strike - spotPrice) - Math.abs(b.strike - spotPrice))[0];

  const atmCall = closest(calls);
  const atmPut  = closest(puts);

  if (!atmCall || !atmPut) {
    return { underlying, expiry, spot: spotPrice, expected_move: null, expected_move_pct: null, atm_call: null, atm_put: null };
  }

  const straddle = (atmCall.mid ?? atmCall.ask) + (atmPut.mid ?? atmPut.ask);
  const pct = straddle / spotPrice;

  return {
    underlying:        underlying.toUpperCase(),
    expiry,
    spot:              spotPrice,
    atm_strike:        atmCall.strike,
    atm_call_mid:      atmCall.mid,
    atm_put_mid:       atmPut.mid,
    straddle_price:    Number(straddle.toFixed(4)),
    expected_move:     Number(straddle.toFixed(4)),
    expected_move_pct: Number((pct * 100).toFixed(2)),
    upside_target:     Number((spotPrice + straddle).toFixed(2)),
    downside_target:   Number((spotPrice - straddle).toFixed(2)),
    atm_iv:            atmCall.iv ?? null,
  };
}

// ── Internal helpers ────────────────────────────────────────────────────────

function _parseSnapshot(ticker, s) {
  // Alpaca returns tickers as either "SOFI260618C00018500" or "O:SOFI260618C00018500"
  const raw = ticker.startsWith("O:") ? ticker.slice(2) : ticker;
  const match = raw.match(/^([A-Z]+)(\d{6})([CP])(\d{8})$/);
  const type   = match?.[3] === "C" ? "call" : "put";
  const expiry = match ? `20${match[2].slice(0,2)}-${match[2].slice(2,4)}-${match[2].slice(4,6)}` : null;
  const strike = match ? parseInt(match[4], 10) / 1000 : null;

  const quote = s.latestQuote ?? {};
  const mid = (quote.ap != null && quote.bp != null)
    ? Number(((quote.ap + quote.bp) / 2).toFixed(4))
    : null;

  return {
    ticker,
    underlying: match?.[1] ?? null,
    type,
    expiry,
    strike,
    iv:    s.impliedVolatility ?? null,
    delta: s.greeks?.delta ?? null,
    gamma: s.greeks?.gamma ?? null,
    theta: s.greeks?.theta ?? null,
    vega:  s.greeks?.vega  ?? null,
    rho:   s.greeks?.rho   ?? null,
    bid:   quote.bp ?? null,
    ask:   quote.ap ?? null,
    mid,
    last:        s.latestTrade?.p  ?? null,
    volume:      s.dailyBar?.v     ?? null,
    open_interest: null, // not provided by this endpoint
  };
}
