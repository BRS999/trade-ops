/**
 * Kalshi adapter — public read API.
 *
 * Usage:
 *   import { KalshiClient, listMarkets, getOrderbook } from "./adapters/kalshi/index.mjs";
 *
 *   const client = new KalshiClient();
 *   const btcMarkets = await listMarkets(client, { status: "open", series: "KXBTC" });
 *
 * This adapter is read-only. It is for market discovery, liquidity checks, and
 * validation before a human decides what belongs in the trade plan.
 */

export { KalshiClient, KalshiError } from "./client.mjs";

export function getExchangeStatus(client) {
  return client.get("exchange/status");
}

export function listMarkets(client, options = {}) {
  return client.get("markets", {
    limit: options.limit ?? 100,
    status: options.status,
    series_ticker: options.series ?? options.series_ticker,
    event_ticker: options.event ?? options.event_ticker,
    cursor: options.cursor,
  });
}

export function getMarket(client, ticker) {
  return client.get(`markets/${encodeURIComponent(requireValue(ticker, "ticker"))}`);
}

export function getOrderbook(client, ticker, options = {}) {
  return client.get(
    `markets/${encodeURIComponent(requireValue(ticker, "ticker"))}/orderbook`,
    { depth: options.depth },
  );
}

export function listTrades(client, options = {}) {
  return client.get("markets/trades", {
    ticker: options.ticker,
    limit: options.limit ?? 100,
    cursor: options.cursor,
    min_ts: options.minTs ?? options.min_ts,
    max_ts: options.maxTs ?? options.max_ts,
  });
}

export function listEvents(client, options = {}) {
  return client.get("events", {
    limit: options.limit ?? 100,
    status: options.status,
    series_ticker: options.series ?? options.series_ticker,
    cursor: options.cursor,
  });
}

export function getEvent(client, eventTicker) {
  return client.get(`events/${encodeURIComponent(requireValue(eventTicker, "event"))}`);
}

export async function listSeries(client, options = {}) {
  const data = await client.get("series", {
    limit: options.limit ?? 400,
    category: options.category,
    cursor: options.cursor,
  });

  // Kalshi currently returns the full series catalog even when a limit query is
  // supplied. Keep the adapter contract stable for callers and CLI users.
  if (Array.isArray(data.series) && options.limit != null) {
    return { ...data, series: data.series.slice(0, Number(options.limit)) };
  }

  return data;
}

function requireValue(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}
