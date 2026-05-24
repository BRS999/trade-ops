/**
 * Hyperliquid adapter — public read API.
 *
 * Primary use cases:
 *   - US-accessible crypto perpetuals context
 *   - Funding, open interest, mark price, and 24h volume
 *   - Binance futures fallback when Binance returns HTTP 451
 */

export { HyperliquidClient, HyperliquidError } from "./client.mjs";

export function getMetaAndAssetContexts(client) {
  return client.info({ type: "metaAndAssetCtxs" });
}

export function getAllMids(client) {
  return client.info({ type: "allMids" });
}

export async function getPerpPositioningSnapshot(client, symbols = ["BTC", "ETH", "SOL"], options = {}) {
  const data = await getMetaAndAssetContexts(client);
  const [meta, assetContexts] = Array.isArray(data) ? data : [];
  const universe = Array.isArray(meta?.universe) ? meta.universe : [];
  const contexts = Array.isArray(assetContexts) ? assetContexts : [];
  const wanted = new Set(symbols.map((symbol) => normalizeSymbol(symbol)));
  const rows = [];

  for (let index = 0; index < universe.length; index += 1) {
    const asset = universe[index];
    const symbol = normalizeSymbol(asset?.name);
    if (wanted.size && !wanted.has(symbol)) continue;
    const context = contexts[index] ?? {};
    rows.push(normalizeAssetContext(symbol, asset, context));
  }

  return {
    as_of: new Date().toISOString(),
    source: "hyperliquid",
    rows: rows
      .filter((row) => !row.is_delisted)
      .sort((a, b) => b.open_interest - a.open_interest)
      .slice(0, options.limit ?? rows.length),
  };
}

function normalizeAssetContext(symbol, asset, context) {
  return {
    symbol,
    exchange_symbol: asset?.name ?? symbol,
    mark_price: number(context.markPx),
    oracle_price: number(context.oraclePx),
    funding_rate: number(context.funding),
    open_interest: number(context.openInterest),
    volume_24h: number(context.dayNtlVlm),
    premium: number(context.premium),
    previous_day_price: number(context.prevDayPx),
    price_change_24h_pct: percentChange(number(context.prevDayPx), number(context.markPx)),
    max_leverage: number(asset?.maxLeverage),
    is_delisted: Boolean(asset?.isDelisted),
  };
}

function normalizeSymbol(symbol) {
  return String(symbol ?? "").replace(/USDT$/i, "").replace(/-USD$/i, "").toUpperCase();
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function percentChange(start, end) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === 0) return null;
  return Math.round(((end - start) / start) * 10_000) / 100;
}
