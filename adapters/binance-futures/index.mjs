/**
 * Binance USD-M Futures adapter — public read API.
 *
 * Primary use cases:
 *   - Funding-rate context for crypto majors
 *   - Open-interest changes that reveal leverage build-up or unwind
 *   - Long/short ratio and taker-flow context for crowded positioning
 */

export { BinanceFuturesClient, BinanceFuturesError, BinanceSpotClient } from "./client.mjs";

// ── Spot ──────────────────────────────────────────────────────────────────────

/**
 * Latest price for a symbol, or all symbols if none given.
 * @param {string} [symbol]  e.g. "BTCUSDT" — omit for all prices
 */
export function getSpotPrice(client, symbol) {
  return client.get("api/v3/ticker/price", symbol ? { symbol: symbol.toUpperCase() } : {});
}

/**
 * 24-hour rolling statistics: price change, high, low, volume, VWAP.
 * @param {string} [symbol]  Omit for all symbols (large response)
 */
export function getSpot24hr(client, symbol) {
  return client.get("api/v3/ticker/24hr", symbol ? { symbol: symbol.toUpperCase() } : {});
}

/**
 * Best bid and ask price + quantity (useful for spread analysis).
 * @param {string} [symbol]
 */
export function getSpotBookTicker(client, symbol) {
  return client.get("api/v3/ticker/bookTicker", symbol ? { symbol: symbol.toUpperCase() } : {});
}

/**
 * 5-minute average price.
 * @param {string} symbol
 */
export function getSpotAvgPrice(client, symbol) {
  return client.get("api/v3/avgPrice", { symbol: symbol.toUpperCase() });
}

/**
 * Order book depth.
 * @param {string} symbol
 * @param {number} [limit]  5 | 10 | 20 | 50 | 100 | 500 | 1000 (default 20)
 */
export function getSpotOrderBook(client, symbol, limit = 20) {
  return client.get("api/v3/depth", { symbol: symbol.toUpperCase(), limit });
}

/**
 * OHLCV candlestick data.
 * @param {string} symbol
 * @param {string} [interval]  1s 1m 3m 5m 15m 30m 1h 2h 4h 6h 8h 12h 1d 3d 1w 1M (default 1h)
 * @param {number} [limit]     Max 1000 (default 24)
 * @param {number} [startTime] Unix ms
 * @param {number} [endTime]   Unix ms
 */
export function getSpotKlines(client, symbol, options = {}) {
  const { interval = "1h", limit = 24, startTime, endTime } = options;
  return client.get("api/v3/klines", {
    symbol: symbol.toUpperCase(),
    interval,
    limit,
    startTime,
    endTime,
  });
}

/**
 * Rolling window price statistics (flexible window size).
 * @param {string} symbol
 * @param {string} [windowSize]  1m 2m ... 1h 2h ... 1d (default 1h)
 */
export function getSpotTicker(client, symbol, windowSize = "1h") {
  return client.get("api/v3/ticker", { symbol: symbol.toUpperCase(), windowSize });
}

/**
 * Combined spot snapshot for one or more symbols.
 * Returns price, 24h stats, and best bid/ask in one object per symbol.
 *
 * @param {string[]} [symbols]  Default ["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT"]
 */
export async function getSpotSnapshot(client, symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"]) {
  const results = await Promise.all(
    symbols.map(async (sym) => {
      const [stats, book] = await Promise.all([
        getSpot24hr(client, sym),
        getSpotBookTicker(client, sym),
      ]);
      return normalizeSpotSnapshot(sym, stats, book);
    }),
  );

  return {
    as_of: new Date().toISOString(),
    source: "binance_spot",
    symbols: results,
  };
}

function normalizeSpotSnapshot(symbol, stats, book) {
  return {
    symbol,
    price: number(stats.lastPrice),
    price_change_24h: number(stats.priceChange),
    price_change_pct_24h: number(stats.priceChangePercent),
    high_24h: number(stats.highPrice),
    low_24h: number(stats.lowPrice),
    volume_24h: number(stats.volume),
    quote_volume_24h: number(stats.quoteVolume),
    vwap: number(stats.weightedAvgPrice),
    open_24h: number(stats.openPrice),
    bid: number(book.bidPrice),
    bid_qty: number(book.bidQty),
    ask: number(book.askPrice),
    ask_qty: number(book.askQty),
    spread: number(book.askPrice) - number(book.bidPrice),
    trades_24h: stats.count,
  };
}

export function getPremiumIndex(client, symbol) {
  return client.get("fapi/v1/premiumIndex", { symbol: requireSymbol(symbol) });
}

export function getOpenInterest(client, symbol) {
  return client.get("fapi/v1/openInterest", { symbol: requireSymbol(symbol) });
}

export function getFundingRateHistory(client, options = {}) {
  return client.get("fapi/v1/fundingRate", {
    symbol: requireSymbol(options.symbol),
    startTime: options.startTime,
    endTime: options.endTime,
    limit: options.limit ?? 24,
  });
}

export function getOpenInterestHistory(client, options = {}) {
  return client.get("futures/data/openInterestHist", {
    symbol: requireSymbol(options.symbol),
    period: options.period ?? "5m",
    startTime: options.startTime,
    endTime: options.endTime,
    limit: options.limit ?? 30,
  });
}

export function getGlobalLongShortAccountRatio(client, options = {}) {
  return client.get("futures/data/globalLongShortAccountRatio", {
    symbol: requireSymbol(options.symbol),
    period: options.period ?? "5m",
    startTime: options.startTime,
    endTime: options.endTime,
    limit: options.limit ?? 30,
  });
}

export function getTakerLongShortRatio(client, options = {}) {
  return client.get("futures/data/takerlongshortRatio", {
    symbol: requireSymbol(options.symbol),
    period: options.period ?? "5m",
    startTime: options.startTime,
    endTime: options.endTime,
    limit: options.limit ?? 30,
  });
}

export async function getFuturesPositioningSnapshot(client, symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"], options = {}) {
  const period = options.period ?? "15m";
  const limit = options.limit ?? 24;
  const rows = [];

  for (const symbol of symbols) {
    rows.push(await getSymbolSnapshot(client, symbol, { period, limit }));
  }

  return {
    as_of: new Date().toISOString(),
    source: "binance_usdm_futures",
    period,
    limit,
    rows,
  };
}

async function getSymbolSnapshot(client, symbol, options) {
  const [premium, openInterest, funding, oiHistory, longShort, takerFlow] = await Promise.all([
    getPremiumIndex(client, symbol),
    getOpenInterest(client, symbol),
    getFundingRateHistory(client, { symbol, limit: Math.min(options.limit, 100) }),
    getOpenInterestHistory(client, { symbol, period: options.period, limit: options.limit }),
    getGlobalLongShortAccountRatio(client, { symbol, period: options.period, limit: options.limit }),
    getTakerLongShortRatio(client, { symbol, period: options.period, limit: options.limit }),
  ]);

  return normalizeSymbolSnapshot(symbol, { premium, openInterest, funding, oiHistory, longShort, takerFlow });
}

function normalizeSymbolSnapshot(symbol, data) {
  const latestFunding = last(data.funding);
  const latestOiHistory = last(data.oiHistory);
  const firstOiHistory = first(data.oiHistory);
  const latestLongShort = last(data.longShort);
  const latestTakerFlow = last(data.takerFlow);
  const latestOpenInterest = number(data.openInterest?.openInterest);
  const oiHistoryLatest = number(latestOiHistory?.sumOpenInterest);
  const oiHistoryFirst = number(firstOiHistory?.sumOpenInterest);

  return {
    symbol,
    mark_price: number(data.premium?.markPrice),
    index_price: number(data.premium?.indexPrice),
    last_funding_rate: number(data.premium?.lastFundingRate ?? latestFunding?.fundingRate),
    next_funding_time: toIso(data.premium?.nextFundingTime),
    open_interest: latestOpenInterest,
    open_interest_value: number(latestOiHistory?.sumOpenInterestValue),
    open_interest_change_pct: percentChange(oiHistoryFirst, oiHistoryLatest),
    global_long_short_ratio: number(latestLongShort?.longShortRatio),
    long_account_pct: number(latestLongShort?.longAccount),
    short_account_pct: number(latestLongShort?.shortAccount),
    taker_buy_sell_ratio: number(latestTakerFlow?.buySellRatio),
    taker_buy_volume: number(latestTakerFlow?.buyVol),
    taker_sell_volume: number(latestTakerFlow?.sellVol),
    funding_history_count: Array.isArray(data.funding) ? data.funding.length : 0,
  };
}

function requireSymbol(symbol) {
  if (!symbol) throw new Error("symbol is required");
  return String(symbol).toUpperCase();
}

function first(rows) {
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

function last(rows) {
  return Array.isArray(rows) && rows.length ? rows[rows.length - 1] : null;
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function percentChange(start, end) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === 0) return null;
  return Math.round(((end - start) / start) * 10_000) / 100;
}

function toIso(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? new Date(parsed).toISOString() : null;
}
