/**
 * Binance USD-M Futures adapter — public read API.
 *
 * Primary use cases:
 *   - Funding-rate context for crypto majors
 *   - Open-interest changes that reveal leverage build-up or unwind
 *   - Long/short ratio and taker-flow context for crowded positioning
 */

export { BinanceFuturesClient, BinanceFuturesError } from "./client.mjs";

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
