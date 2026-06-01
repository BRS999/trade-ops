/**
 * Alpaca market data functions — equity and crypto bars, quotes, snapshots.
 *
 * Uses data.alpaca.markets/v2 via the same API keys as the trading client.
 * Free tier includes historical daily bars and 15-min delayed quotes.
 *
 * Primary use: fallback when Yahoo Finance or Massive are rate-limited.
 */

/**
 * Daily OHLCV bars for an equity symbol.
 *
 * @param {AlpacaClient} client
 * @param {string} symbol      e.g. "LMT"
 * @param {Object} [opts]
 * @param {string} [opts.start]     ISO date, default 1 year ago
 * @param {string} [opts.end]       ISO date, default today
 * @param {string} [opts.timeframe] "1Day" | "1Hour" | "5Min" etc. Default "1Day"
 * @param {number} [opts.limit]     max bars, default 500
 * @param {string} [opts.feed]      "iex" (free) | "sip" (paid). Default "iex"
 */
export async function getBars(client, symbol, opts = {}) {
  if (looksLikeCryptoPair(symbol)) {
    return getCryptoBars(client, symbol, opts);
  }

  const {
    start = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    end,
    timeframe = "1Day",
    limit = 500,
    feed = "iex",
  } = opts;

  const params = { timeframe, limit, feed };
  if (start) params.start = start;
  if (end)   params.end   = end;

  const data = await client.request("GET", `stocks/${symbol.toUpperCase()}/bars`, { params, base: "data" });
  const bars = data?.bars ?? [];

  return bars.map(b => ({
    date:   b.t.slice(0, 10),
    open:   b.o,
    high:   b.h,
    low:    b.l,
    close:  b.c,
    volume: b.v,
    vwap:   b.vw ?? null,
  }));
}

/**
 * Daily OHLCV bars for an Alpaca crypto pair.
 *
 * Accepts "BTC/USD" or the position-style "BTCUSD".
 */
export async function getCryptoBars(client, symbol, opts = {}) {
  const {
    start = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    end,
    timeframe = "1Day",
    limit = 500,
  } = opts;

  const pair = normalizeCryptoPair(symbol);
  const params = { symbols: pair, timeframe, limit };
  if (start) params.start = start;
  if (end)   params.end   = end;

  const data = await client.request("GET", "/v1beta3/crypto/us/bars", { params, base: "data" });
  const bars = data?.bars?.[pair] ?? [];

  return bars.map(b => ({
    date:   b.t.slice(0, 10),
    open:   b.o,
    high:   b.h,
    low:    b.l,
    close:  b.c,
    volume: b.v,
    vwap:   b.vw ?? null,
  }));
}

/**
 * Latest quote (bid/ask) for an equity symbol.
 */
export async function getLatestQuote(client, symbol) {
  const data = await client.request("GET", `stocks/${symbol.toUpperCase()}/quotes/latest`, { params: { feed: "iex" }, base: "data" });
  const q = data?.quote;
  if (!q) return null;
  return {
    symbol:    symbol.toUpperCase(),
    bid:       q.bp,
    bid_size:  q.bs,
    ask:       q.ap,
    ask_size:  q.as,
    timestamp: q.t,
  };
}

/**
 * Latest trade (last price) for an equity symbol.
 */
export async function getLatestTrade(client, symbol) {
  const data = await client.request("GET", `stocks/${symbol.toUpperCase()}/trades/latest`, { params: { feed: "iex" }, base: "data" });
  const t = data?.trade;
  if (!t) return null;
  return {
    symbol:    symbol.toUpperCase(),
    price:     t.p,
    size:      t.s,
    timestamp: t.t,
    exchange:  t.x,
  };
}

/**
 * Snapshot for one or more equity symbols — latest trade, quote, daily bar, prev bar.
 *
 * @param {string|string[]} symbols
 */
export async function getSnapshots(client, symbols) {
  const syms = Array.isArray(symbols) ? symbols : [symbols];
  const data = await client.request("GET", "stocks/snapshots", {
    params: { symbols: syms.map(s => s.toUpperCase()).join(","), feed: "iex" },
    base: "data",
  });
  return data ?? {};
}

/**
 * Bars formatted for the forecasting pipeline — returns [{timestamp, close}] for
 * Chronos/TimesFM and [{timestamp, open, high, low, close}] for Kronos.
 *
 * @param {string} symbol
 * @param {Object} [opts]   same as getBars
 * @returns {{ closes: Array, ohlc: Array }}
 */
export async function getBarsForForecast(client, symbol, opts = {}) {
  const bars = await getBars(client, symbol, opts);
  const closes = bars.map(b => ({ timestamp: new Date(b.date).getTime(), close: b.close }));
  const ohlc   = bars.map(b => ({ timestamp: Math.floor(new Date(b.date).getTime() / 1000), open: b.open, high: b.high, low: b.low, close: b.close }));
  return { closes, ohlc, bars };
}

function looksLikeCryptoPair(symbol) {
  return /^[A-Z0-9]+\/USD$/i.test(symbol) || /^[A-Z0-9]+USD$/i.test(symbol);
}

function normalizeCryptoPair(symbol) {
  const upper = symbol.toUpperCase();
  if (upper.includes("/")) return upper;
  return `${upper.slice(0, -3)}/USD`;
}
