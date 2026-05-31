/**
 * Yahoo Finance options chain functions.
 *
 * Returns full options chains for any equity symbol with IV, volume, OI,
 * and Black-Scholes greeks computed from IV.
 *
 * Requires crumb auth — handled automatically by YahooClient.getWithCrumb().
 */

// ── Black-Scholes greeks ──────────────────────────────────────────────────

function normCdf(x) {
  const a = 0.2316419, b1 = 0.319381530, b2 = -0.356563782,
        b3 = 1.781477937, b4 = -1.821255978, b5 = 1.330274429;
  const t = 1 / (1 + a * Math.abs(x));
  const poly = t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));
  const pdf = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return x >= 0 ? cdf : 1 - cdf;
}

function normPdf(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function computeGreeks(S, K, T, iv, r, isCall) {
  if (!iv || iv <= 0 || T <= 0 || S <= 0) return null;
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * iv * iv) * T) / (iv * sqrtT);
  const d2 = d1 - iv * sqrtT;
  const nd1 = normCdf(d1), nd2 = normCdf(d2);
  const npd1 = normPdf(d1);
  const ert = Math.exp(-r * T);

  return {
    delta: isCall ? nd1 : nd1 - 1,
    gamma: npd1 / (S * iv * sqrtT),
    theta: isCall
      ? ((-S * npd1 * iv / (2 * sqrtT)) - r * K * ert * nd2) / 365
      : ((-S * npd1 * iv / (2 * sqrtT)) + r * K * ert * (1 - nd2)) / 365,
    vega: S * npd1 * sqrtT / 100,
    rho: isCall
      ? K * T * ert * nd2 / 100
      : -K * T * ert * (1 - nd2) / 100,
  };
}

// ── Parsing ───────────────────────────────────────────────────────────────

function parseContract(raw, spot, r = 0.045) {
  const expiry = raw.expiration;
  const now = Date.now() / 1000;
  const T = Math.max((expiry - now) / (365 * 24 * 3600), 0);
  const iv = raw.impliedVolatility ?? null;
  const isCall = raw.contractSymbol?.match(/C\d{8}$/) !== null;
  const greeks = iv ? computeGreeks(spot, raw.strike, T, iv, r, isCall) : null;

  return {
    contract: raw.contractSymbol,
    expiry: new Date(expiry * 1000).toISOString().slice(0, 10),
    dte: Math.round(T * 365),
    strike: raw.strike,
    last: raw.lastPrice,
    bid: raw.bid,
    ask: raw.ask,
    volume: raw.volume ?? 0,
    open_interest: raw.openInterest ?? 0,
    iv: iv ? Number(iv.toFixed(4)) : null,
    in_the_money: raw.inTheMoney ?? false,
    ...(greeks ? {
      delta: Number(greeks.delta.toFixed(4)),
      gamma: Number(greeks.gamma.toFixed(6)),
      theta: Number(greeks.theta.toFixed(4)),
      vega: Number(greeks.vega.toFixed(4)),
      rho: Number(greeks.rho.toFixed(4)),
    } : {}),
  };
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * List available expiration dates for a symbol.
 */
export async function getExpiries(client, symbol) {
  const data = await client.getWithCrumb(`/v7/finance/options/${symbol.toUpperCase()}`);
  const result = data?.optionChain?.result?.[0];
  if (!result) throw new Error(`No options data for ${symbol}`);
  return {
    symbol: result.underlyingSymbol,
    spot: result.quote?.regularMarketPrice,
    expiries: (result.expirationDates ?? []).map(ts => ({
      timestamp: ts,
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      dte: Math.round((ts - Date.now() / 1000) / 86400),
    })),
  };
}

/**
 * Full options chain for a symbol and expiry date (YYYY-MM-DD).
 * Defaults to the nearest expiry if not specified.
 *
 * @param {Object} [opts]
 * @param {string} [opts.expiry]   YYYY-MM-DD
 * @param {string} [opts.type]     'calls' | 'puts' | 'all' (default 'all')
 * @param {number} [opts.strikes]  number of strikes either side of ATM (default all)
 */
export async function getChain(client, symbol, opts = {}) {
  const { type = "all", strikes, expiry } = opts;

  let expirationTs;
  if (expiry) {
    expirationTs = Math.floor(new Date(expiry + "T00:00:00Z").getTime() / 1000);
  }

  const params = expirationTs ? { date: expirationTs } : {};
  const data = await client.getWithCrumb(`/v7/finance/options/${symbol.toUpperCase()}`, params);
  const result = data?.optionChain?.result?.[0];
  if (!result) throw new Error(`No options data for ${symbol}`);

  const spot = result.quote?.regularMarketPrice ?? 0;
  const chain = result.options?.[0];
  if (!chain) throw new Error(`No chain data for ${symbol} expiry ${expiry ?? "nearest"}`);

  let calls = (chain.calls ?? []).map(c => parseContract(c, spot));
  let puts  = (chain.puts  ?? []).map(p => parseContract(p, spot));

  if (strikes && spot) {
    const filter = cs => {
      const atm = cs.reduce((best, c) => Math.abs(c.strike - spot) < Math.abs(best.strike - spot) ? c : best, cs[0]);
      const idx = cs.indexOf(atm);
      return cs.slice(Math.max(0, idx - strikes), idx + strikes + 1);
    };
    calls = filter(calls);
    puts  = filter(puts);
  }

  return {
    symbol: result.underlyingSymbol,
    spot,
    expiry: new Date(chain.expirationDate * 1000).toISOString().slice(0, 10),
    dte: Math.round((chain.expirationDate - Date.now() / 1000) / 86400),
    ...(type !== "puts"  ? { calls } : {}),
    ...(type !== "calls" ? { puts  } : {}),
  };
}

/**
 * ATM snapshot — nearest expiry, 5 strikes either side of spot.
 * Quick read on IV and positioning around current price.
 */
export async function getAtmSnapshot(client, symbol) {
  return getChain(client, symbol, { strikes: 5 });
}
