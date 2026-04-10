/**
 * Yahoo Finance quotes — live price snapshot and historical OHLCV bars.
 *
 * getQuote(client, symbol)        → live price, change %, day OHLC, volume
 * getBars(client, symbol, opts)   → historical OHLCV array
 *
 * All data sourced from /v8/finance/chart which is free with no API key.
 * Prices are 15-min delayed for equities during market hours.
 *
 * Symbol conventions:
 *   Equities:  NVDA, META
 *   Crypto:    BTC-USD, SOL-USD, ETH-USD
 *   Indices:   ^GSPC, ^NDX, ^DJI
 *   Forex:     EURUSD=X
 *   Futures:   ES=F, NQ=F, GC=F, CL=F
 */

/**
 * @typedef {Object} Quote
 * @property {string}      symbol
 * @property {string|null} name
 * @property {string|null} exchange
 * @property {number|null} price              Current/last price
 * @property {number|null} prev_close         Previous session close
 * @property {number|null} change             Absolute change from prev close
 * @property {number|null} change_pct         % change from prev close
 * @property {number|null} day_open
 * @property {number|null} day_high
 * @property {number|null} day_low
 * @property {number|null} volume
 * @property {number|null} fifty_two_week_high
 * @property {number|null} fifty_two_week_low
 * @property {string|null} market_state       'PRE' | 'REGULAR' | 'POST' | 'CLOSED'
 */

/**
 * @typedef {Object} Bar
 * @property {string} symbol
 * @property {number} timestamp    Unix seconds (start of bar)
 * @property {number} open
 * @property {number} high
 * @property {number} low
 * @property {number} close
 * @property {number} volume
 */

/**
 * Fetch a live price quote for a single symbol.
 *
 * Endpoint: GET /v8/finance/chart/{symbol}?interval=1d&range=1d
 *
 * @param {import('./client.mjs').YahooClient} client
 * @param {string} symbol
 * @returns {Promise<Quote>}
 */
export async function getQuote(client, symbol) {
  const data = await client.get(`/v8/finance/chart/${encodeURIComponent(symbol)}`, {
    interval: "1d",
    range: "1d",
  });

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No data returned for symbol: ${symbol}`);

  const meta = result.meta ?? {};
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? null;
  const price = meta.regularMarketPrice ?? null;
  const change = price !== null && prevClose !== null ? price - prevClose : null;
  const change_pct = change !== null && prevClose ? (change / prevClose) * 100 : null;

  return {
    symbol: meta.symbol ?? symbol,
    name: meta.longName ?? meta.shortName ?? null,
    exchange: meta.fullExchangeName ?? meta.exchangeName ?? null,
    price,
    prev_close: prevClose,
    change,
    change_pct,
    day_open: meta.regularMarketDayHigh != null ? (result.indicators?.quote?.[0]?.open?.at(-1) ?? null) : null,
    day_high: meta.regularMarketDayHigh ?? null,
    day_low: meta.regularMarketDayLow ?? null,
    volume: meta.regularMarketVolume ?? null,
    fifty_two_week_high: meta.fiftyTwoWeekHigh ?? null,
    fifty_two_week_low: meta.fiftyTwoWeekLow ?? null,
    market_state: meta.marketState ?? null,
  };
}

/**
 * Fetch a 24-hour rolling quote for a crypto symbol.
 *
 * Yahoo's standard quote endpoint uses UTC-midnight as prev_close, which makes
 * the change % meaningless for 24/7 crypto markets. This function pulls 1h bars
 * for the last 2 days, finds the bar from ~24h ago, and derives a proper rolling
 * 24h change — matching the convention used by crypto exchanges and CoinGecko.
 *
 * Endpoint: GET /v8/finance/chart/{symbol}?interval=1h&range=2d
 *
 * @param {import('./client.mjs').YahooClient} client
 * @param {string} symbol  e.g. "BTC-USD", "SOL-USD"
 * @returns {Promise<Quote>}
 */
export async function getCryptoQuote(client, symbol) {
  const data = await client.get(`/v8/finance/chart/${encodeURIComponent(symbol)}`, {
    interval: "1h",
    range: "2d",
  });

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No data returned for symbol: ${symbol}`);

  const meta = result.meta ?? {};
  const timestamps = result.timestamp ?? [];
  const ohlcv = result.indicators?.quote?.[0] ?? {};

  const bars = timestamps
    .map((t, i) => ({
      timestamp: t,
      open: ohlcv.open?.[i] ?? null,
      high: ohlcv.high?.[i] ?? null,
      low: ohlcv.low?.[i] ?? null,
      close: ohlcv.close?.[i] ?? null,
      volume: ohlcv.volume?.[i] ?? null,
    }))
    .filter((b) => b.close !== null);

  if (bars.length === 0) throw new Error(`No bar data for symbol: ${symbol}`);

  const price = meta.regularMarketPrice ?? bars.at(-1).close;
  const nowTs = Date.now() / 1000;
  const target24hAgo = nowTs - 86400;

  // Bar closest to exactly 24h ago — used as the rolling reference price
  const ref = bars.reduce((best, bar) =>
    Math.abs(bar.timestamp - target24hAgo) < Math.abs(best.timestamp - target24hAgo) ? bar : best
  );

  const change = price - ref.close;
  const change_pct = (change / ref.close) * 100;

  // 24h high/low from bars within the rolling window
  const recentBars = bars.filter((b) => b.timestamp >= target24hAgo);
  const day_high = recentBars.reduce((m, b) => (b.high != null && b.high > m ? b.high : m), -Infinity);
  const day_low = recentBars.reduce((m, b) => (b.low != null && b.low < m ? b.low : m), Infinity);

  return {
    symbol: meta.symbol ?? symbol,
    name: meta.longName ?? meta.shortName ?? null,
    exchange: meta.fullExchangeName ?? meta.exchangeName ?? null,
    price,
    prev_close: ref.close,
    change,
    change_pct,
    day_open: recentBars[0]?.open ?? null,
    day_high: isFinite(day_high) ? day_high : null,
    day_low: isFinite(day_low) ? day_low : null,
    volume: meta.regularMarketVolume ?? null,
    fifty_two_week_high: meta.fiftyTwoWeekHigh ?? null,
    fifty_two_week_low: meta.fiftyTwoWeekLow ?? null,
    market_state: meta.marketState ?? null,
  };
}

/**
 * Fetch quotes for multiple symbols. Sequential to respect rate limits.
 *
 * @param {import('./client.mjs').YahooClient} client
 * @param {string[]} symbols
 * @returns {Promise<Quote[]>}
 */
export async function getQuotes(client, symbols) {
  const results = [];
  for (const symbol of symbols) {
    const quote = await getQuote(client, symbol).catch((e) => ({
      symbol,
      error: e.message,
    }));
    results.push(quote);
  }
  return results;
}

/**
 * Fetch historical OHLCV bars.
 *
 * @param {import('./client.mjs').YahooClient} client
 * @param {string} symbol
 * @param {Object} options
 * @param {string} [options.interval='1d']   '1m'|'5m'|'15m'|'1h'|'1d'|'1wk'|'1mo'
 * @param {string} [options.range='3mo']     '1d'|'5d'|'1mo'|'3mo'|'6mo'|'1y'|'2y'|'5y'|'10y'|'ytd'|'max'
 * @returns {Promise<Bar[]>}
 */
export async function getBars(client, symbol, options = {}) {
  const { interval = "1d", range = "3mo" } = options;

  const data = await client.get(`/v8/finance/chart/${encodeURIComponent(symbol)}`, {
    interval,
    range,
  });

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No bar data returned for symbol: ${symbol}`);

  const timestamps = result.timestamp ?? [];
  const ohlcv = result.indicators?.quote?.[0] ?? {};

  return timestamps.map((t, i) => ({
    symbol: result.meta?.symbol ?? symbol,
    timestamp: t,
    open: ohlcv.open?.[i] ?? null,
    high: ohlcv.high?.[i] ?? null,
    low: ohlcv.low?.[i] ?? null,
    close: ohlcv.close?.[i] ?? null,
    volume: ohlcv.volume?.[i] ?? null,
  })).filter((bar) => bar.close !== null);
}
