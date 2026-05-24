/**
 * Polymarket adapter — public read API.
 *
 * Primary use cases:
 *   - Active event-market discovery
 *   - Cross-checking Kalshi probability/liquidity views
 *   - Finding event repricing candidates for research memos
 */

export { PolymarketClient, PolymarketError } from "./client.mjs";

export function listMarkets(client, options = {}) {
  return client.gamma("markets", normalizeDiscoveryOptions(options));
}

export function listEvents(client, options = {}) {
  return client.gamma("events", normalizeDiscoveryOptions(options));
}

export function getMarket(client, id) {
  return client.gamma(`markets/${encodeURIComponent(requireValue(id, "market id"))}`);
}

export function getEvent(client, id) {
  return client.gamma(`events/${encodeURIComponent(requireValue(id, "event id"))}`);
}

export function getOrderBook(client, tokenId) {
  return client.clob("book", { token_id: requireValue(tokenId, "token id") });
}

export async function getActiveMarketScan(client, options = {}) {
  const limit = options.limit ?? 100;
  const sort = options.sort ?? "volume24hr";
  const markets = await listMarkets(client, {
    active: true,
    closed: false,
    archived: false,
    limit,
    offset: options.offset,
    order: sort,
    ascending: false,
  });

  return summarizeMarkets(Array.isArray(markets) ? markets : markets.markets ?? []);
}

function normalizeDiscoveryOptions(options) {
  return {
    limit: options.limit ?? 100,
    offset: options.offset,
    active: options.active,
    closed: options.closed,
    archived: options.archived,
    tag_id: options.tagId ?? options.tag_id,
    related_tags: options.relatedTags ?? options.related_tags,
    order: options.order,
    ascending: options.ascending,
    liquidity_num_min: options.liquidityMin ?? options.liquidity_num_min,
    volume_num_min: options.volumeMin ?? options.volume_num_min,
    volume_24hr_min: options.volume24hMin ?? options.volume_24hr_min,
    end_date_min: options.endDateMin ?? options.end_date_min,
    end_date_max: options.endDateMax ?? options.end_date_max,
    q: options.q,
  };
}

function summarizeMarkets(markets) {
  const rows = markets.map(normalizeMarket);
  return {
    as_of: new Date().toISOString(),
    source: "polymarket_gamma",
    scanned: rows.length,
    active_markets: rows.filter((row) => row.active).length,
    markets_with_volume: rows.filter((row) => row.volume > 0 || row.volume_24h > 0).length,
    total_volume: sum(rows, "volume"),
    total_volume_24h: sum(rows, "volume_24h"),
    total_liquidity: sum(rows, "liquidity"),
    top_by_volume_24h: [...rows].sort((a, b) => b.volume_24h - a.volume_24h).slice(0, 20),
    top_by_liquidity: [...rows].sort((a, b) => b.liquidity - a.liquidity).slice(0, 20),
  };
}

function normalizeMarket(market) {
  return {
    id: market.id ?? null,
    question: market.question ?? market.title ?? null,
    slug: market.slug ?? null,
    active: Boolean(market.active),
    closed: Boolean(market.closed),
    archived: Boolean(market.archived),
    volume: number(market.volumeNum ?? market.volume),
    volume_24h: number(market.volume24hr ?? market.volume24hrClob ?? market.volume_24hr),
    liquidity: number(market.liquidityNum ?? market.liquidity),
    end_date: market.endDate ?? market.end_date_iso ?? null,
    outcomes: parseJsonArray(market.outcomes),
    outcome_prices: parseJsonArray(market.outcomePrices),
    clob_token_ids: parseJsonArray(market.clobTokenIds),
    condition_id: market.conditionId ?? null,
  };
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + number(row[field]), 0);
}

function requireValue(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}
