/**
 * Kraken adapter — public read API.
 *
 * Primary use cases:
 *   - Spot liquidity/venue confirmation
 *   - Public ticker, order-book, trades, and OHLC data
 */

export { KrakenClient, KrakenError } from "./client.mjs";

export function getAssetPairs(client, pair) {
  return client.get("public/AssetPairs", { pair });
}

export function getTicker(client, pair) {
  return client.get("public/Ticker", { pair: requireValue(pair, "pair") });
}

export function getOrderBook(client, pair, options = {}) {
  return client.get("public/Depth", { pair: requireValue(pair, "pair"), count: options.count ?? 50 });
}

export function getOhlc(client, pair, options = {}) {
  return client.get("public/OHLC", {
    pair: requireValue(pair, "pair"),
    interval: options.interval ?? 60,
    since: options.since,
  });
}

export async function getSpotSnapshot(client, pairs = ["XBTUSD", "ETHUSD", "SOLUSD"]) {
  const rows = [];
  for (const pair of pairs) {
    const [ticker, book] = await Promise.all([
      getTicker(client, pair),
      getOrderBook(client, pair, { count: 20 }),
    ]);
    rows.push(normalizePair(pair, ticker, book));
  }

  return {
    as_of: new Date().toISOString(),
    source: "kraken",
    rows,
  };
}

function normalizePair(pair, ticker, book) {
  const tickerKey = Object.keys(ticker ?? {})[0];
  const bookKey = Object.keys(book ?? {})[0];
  const row = ticker?.[tickerKey] ?? {};
  const bids = book?.[bookKey]?.bids ?? [];
  const asks = book?.[bookKey]?.asks ?? [];
  const bestBid = number(bids[0]?.[0]);
  const bestAsk = number(asks[0]?.[0]);

  return {
    pair,
    price: number(row.c?.[0]),
    volume_24h: number(row.v?.[1]),
    high_24h: number(row.h?.[1]),
    low_24h: number(row.l?.[1]),
    open_24h: number(row.o),
    best_bid: bestBid,
    best_ask: bestAsk,
    spread_pct: bestBid && bestAsk ? round(((bestAsk - bestBid) / ((bestAsk + bestBid) / 2)) * 100, 4) : null,
    bid_depth: bids.length,
    ask_depth: asks.length,
  };
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value, places = 2) {
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 10 ** places) / 10 ** places;
}

function requireValue(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}
