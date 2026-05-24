/**
 * Coinbase adapter — public read API.
 *
 * Primary use cases:
 *   - US-accessible spot venue confirmation
 *   - Public order-book depth and candle cross-checks
 */

export { CoinbaseClient, CoinbaseError } from "./client.mjs";

export function listProducts(client, options = {}) {
  return client.get("market/products", {
    limit: options.limit ?? 100,
    offset: options.offset,
    product_type: options.productType ?? options.product_type,
    product_ids: Array.isArray(options.productIds) ? options.productIds.join(",") : options.productIds,
  });
}

export function getProduct(client, productId) {
  return client.get(`market/products/${encodeURIComponent(requireValue(productId, "productId"))}`);
}

export function getProductBook(client, productId, options = {}) {
  return client.get("market/product_book", {
    product_id: requireValue(productId, "productId"),
    limit: options.limit ?? 50,
  });
}

export function getProductCandles(client, productId, options = {}) {
  return client.get(`market/products/${encodeURIComponent(requireValue(productId, "productId"))}/candles`, {
    start: options.start,
    end: options.end,
    granularity: options.granularity ?? "ONE_HOUR",
    limit: options.limit,
  });
}

export async function getSpotSnapshot(client, products = ["BTC-USD", "ETH-USD", "SOL-USD"]) {
  const rows = [];
  for (const product of products) {
    const [detail, book] = await Promise.all([
      getProduct(client, product),
      getProductBook(client, product, { limit: 20 }),
    ]);
    rows.push(normalizeSpot(product, detail, book));
  }

  return {
    as_of: new Date().toISOString(),
    source: "coinbase",
    rows,
  };
}

function normalizeSpot(product, detail, book) {
  const bids = book?.pricebook?.bids ?? [];
  const asks = book?.pricebook?.asks ?? [];
  const bestBid = number(bids[0]?.price);
  const bestAsk = number(asks[0]?.price);
  return {
    product_id: product,
    price: number(detail.price),
    volume_24h: number(detail.volume_24h),
    volume_percentage_change_24h: number(detail.volume_percentage_change_24h),
    price_percentage_change_24h: number(detail.price_percentage_change_24h),
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
