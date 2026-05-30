/**
 * CoinGecko adapter — public API.
 *
 * Exports clean functions over the CoinGecko v3 API. All functions take a
 * CoinGeckoClient as their first argument.
 *
 * Key distinction from GeckoTerminal (already in this repo):
 *   - CoinGecko = aggregated CEX + DEX data, reviewed coin listings, global stats
 *   - GeckoTerminal = on-chain DEX data only, long-tail/new tokens
 *
 * Prefer CoinGecko when you need reliable aggregated prices, market caps, global
 * market context, or trending data. Fall back to GeckoTerminal for pool-level or
 * on-chain-specific data.
 */

export { CoinGeckoClient, CoinGeckoError } from "./client.mjs";

/** Check API server health. */
export function ping(client) {
  return client.get("/ping");
}

/** Monitor API key usage (rate limit, monthly credits). Requires an API key. */
export function getKeyUsage(client) {
  return client.get("/key");
}

// ── Global market ──────────────────────────────────────────────────────────

/**
 * Global crypto market data: total market cap, total volume, BTC/ETH dominance,
 * 24h market cap change, and active cryptocurrency count.
 */
export function getGlobalMarket(client) {
  return client.get("/global");
}

/**
 * Global DeFi market data derived from the top 100 DeFi coins:
 * DeFi market cap, DeFi dominance, DeFi/ETH ratio, 24h volume.
 */
export function getGlobalDeFi(client) {
  return client.get("/global/decentralized_finance_defi");
}

// ── Discovery ──────────────────────────────────────────────────────────────

/**
 * Top 7 trending coins, top 3 trending NFTs, and top 6 trending categories
 * on CoinGecko over the last 24 hours (based on user search activity).
 */
export function getTrending(client) {
  return client.get("/search/trending");
}

/**
 * Recently added coins on CoinGecko. Returns the latest listings with their
 * activation timestamps.
 */
export function getNewCoins(client) {
  return client.get("/coins/list/new");
}

/**
 * Search coins, exchanges, NFTs, and categories by name or symbol.
 * Use this to resolve a CoinGecko coin ID from a symbol or name.
 *
 * @param {string} query  Search term
 */
export function search(client, query) {
  return client.get("/search", { query });
}

// ── Coin data ──────────────────────────────────────────────────────────────

/**
 * Coin market data list: price, market cap, volume, ATH, supply.
 * The most useful general-purpose endpoint for tracking multiple coins at once.
 *
 * @param {Object} options
 * @param {string}   [options.ids]                   Comma-separated CoinGecko coin IDs
 * @param {string}   [options.symbols]               Comma-separated symbols (less precise than IDs)
 * @param {string}   [options.category]              Filter by category slug
 * @param {string}   [options.order]                 market_cap_desc (default), volume_desc, etc.
 * @param {number}   [options.perPage]               1–250 results per page (default 100)
 * @param {number}   [options.page]                  Page number (default 1)
 * @param {string}   [options.priceChangePercentage] Comma-separated timeframes: 1h,24h,7d,30d,1y
 * @param {string}   [options.vsCurrency]            Target currency (default usd)
 */
export function getMarkets(client, options = {}) {
  const {
    ids,
    symbols,
    category,
    order,
    perPage,
    page,
    priceChangePercentage,
    vsCurrency = "usd",
  } = options;

  return client.get("/coins/markets", {
    vs_currency: vsCurrency,
    ids,
    symbols,
    category,
    order,
    per_page: perPage,
    page,
    price_change_percentage: priceChangePercentage,
    sparkline: false,
  });
}

/**
 * Simple price lookup for one or more coins by CoinGecko ID.
 *
 * @param {string|string[]} coinIds  One or more CoinGecko IDs (e.g. "bitcoin" or ["bitcoin","solana"])
 * @param {Object} options
 * @param {string}  [options.vsCurrencies]  Target currencies (default "usd")
 * @param {boolean} [options.marketCap]     Include market cap
 * @param {boolean} [options.vol24h]        Include 24h volume
 * @param {boolean} [options.change24h]     Include 24h change %
 */
export function getPrice(client, coinIds, options = {}) {
  const ids = Array.isArray(coinIds) ? coinIds.join(",") : coinIds;
  const { vsCurrencies = "usd", marketCap, vol24h, change24h } = options;
  return client.get("/simple/price", {
    ids,
    vs_currencies: vsCurrencies,
    include_market_cap: marketCap || undefined,
    include_24hr_vol: vol24h || undefined,
    include_24hr_change: change24h || undefined,
    include_last_updated_at: true,
  });
}

/**
 * Full metadata and market data for a single coin.
 *
 * @param {string} coinId  CoinGecko coin ID (e.g. "bitcoin")
 * @param {Object} options
 * @param {boolean} [options.tickers]   Include exchange tickers (default false — large payload)
 * @param {boolean} [options.community] Include community data (default false)
 * @param {boolean} [options.developer] Include developer data (default false)
 */
export function getCoin(client, coinId, options = {}) {
  const { tickers = false, community = false, developer = false } = options;
  return client.get(`/coins/${coinId}`, {
    localization: false,
    tickers,
    market_data: true,
    community_data: community,
    developer_data: developer,
    sparkline: false,
  });
}

/**
 * OHLC candle data for a coin.
 *
 * @param {string} coinId     CoinGecko coin ID
 * @param {Object} options
 * @param {string|number} [options.days]        Lookback: 1, 7, 14, 30, 90, 180, 365, or "max"
 * @param {string}        [options.vsCurrency]  Target currency (default usd)
 */
export function getOhlc(client, coinId, options = {}) {
  const { days = 30, vsCurrency = "usd" } = options;
  return client.get(`/coins/${coinId}/ohlc`, {
    vs_currency: vsCurrency,
    days,
  });
}

/**
 * Top 30 gainers and top 30 losers by price change.
 * Requires a paid plan (Analyst or above). Will throw CoinGeckoError 403/10005
 * on free/Demo keys.
 *
 * @param {Object} options
 * @param {string} [options.duration]   1h, 24h (default), 7d, 14d, 30d, 1y
 * @param {string} [options.topCoins]   300, 500, 1000 (default), or "all"
 * @param {string} [options.vsCurrency] Target currency (default usd)
 */
export function getTopGainersLosers(client, options = {}) {
  const { duration, topCoins, vsCurrency = "usd" } = options;
  return client.get("/coins/top_gainers_losers", {
    vs_currency: vsCurrency,
    duration,
    top_coins: topCoins,
  });
}

// ── Snapshot ───────────────────────────────────────────────────────────────

/**
 * Combined crypto market snapshot: global stats + DeFi stats + trending coins.
 * A single call that covers the most common "what's the market doing?" context.
 */
// ── Market chart ──────────────────────────────────────────────────────────

/**
 * Historical price, market cap, and volume for a coin.
 *
 * @param {string} coinId
 * @param {Object} [opts]
 * @param {string|number} [opts.days]       1 7 14 30 90 180 365 "max"
 * @param {string}        [opts.vsCurrency] default usd
 * @param {string}        [opts.interval]   daily | hourly (auto if omitted)
 */
export function getMarketChart(client, coinId, opts = {}) {
  const { days = 30, vsCurrency = "usd", interval } = opts;
  return client.get(`/coins/${coinId}/market_chart`, {
    vs_currency: vsCurrency,
    days,
    interval,
  });
}

// ── Categories ─────────────────────────────────────────────────────────────

/**
 * All coin categories with market cap and 24h change.
 *
 * @param {Object} [opts]
 * @param {string} [opts.order]  market_cap_desc (default) | market_cap_change_24h_desc | name_asc
 */
export function getCategories(client, opts = {}) {
  return client.get("/coins/categories", { order: opts.order });
}

// ── Exchange rates ─────────────────────────────────────────────────────────

/**
 * BTC-denominated exchange rates against all supported currencies.
 * Use to convert BTC values to USD, ETH, gold, etc.
 */
export function getExchangeRates(client) {
  return client.get("/exchange_rates");
}

// ── Treasury ───────────────────────────────────────────────────────────────

/**
 * List all public company or government entities with known crypto holdings.
 *
 * @param {Object} [opts]
 * @param {string} [opts.entityType]  "company" | "government" (default: all)
 * @param {number} [opts.perPage]     default 100, max 250
 * @param {number} [opts.page]        default 1
 */
export function getEntities(client, opts = {}) {
  return client.get("/entities/list", {
    entity_type: opts.entityType,
    per_page: opts.perPage,
    page: opts.page,
  });
}

/**
 * Full treasury holdings for a specific entity (company or government).
 * Includes unrealized P&L, mNAV, NAV per share, and optional holding changes.
 *
 * @param {string} entityId  e.g. "strategy", "united-states", "north-korea"
 * @param {Object} [opts]
 * @param {string} [opts.holdingAmountChange]     comma-separated: "7d,30d,1y"
 * @param {string} [opts.holdingChangePercentage] comma-separated: "7d,30d,1y"
 */
export function getEntityTreasury(client, entityId, opts = {}) {
  return client.get(`/public_treasury/${entityId}`, {
    holding_amount_change: opts.holdingAmountChange,
    holding_change_percentage: opts.holdingChangePercentage,
  });
}

/**
 * Historical holding chart for an entity's specific coin.
 *
 * @param {string} entityId
 * @param {string} coinId    e.g. "bitcoin"
 * @param {string|number} days  7 14 30 90 180 365 "max"
 */
export function getEntityHoldingChart(client, entityId, coinId, days = 365) {
  return client.get(`/public_treasury/${entityId}/${coinId}/holding_chart`, {
    days,
    include_empty_intervals: false,
  });
}

/**
 * Buy/sell transaction history for an entity.
 *
 * @param {string} entityId
 * @param {Object} [opts]
 * @param {number} [opts.perPage]  default 100
 * @param {number} [opts.page]     default 1
 * @param {string} [opts.order]    date_desc (default) | transaction_value_usd_desc
 * @param {string} [opts.coinIds]  filter, e.g. "bitcoin,ethereum"
 */
export function getEntityTransactions(client, entityId, opts = {}) {
  return client.get(`/public_treasury/${entityId}/transaction_history`, {
    per_page: opts.perPage,
    page: opts.page,
    order: opts.order,
    coin_ids: opts.coinIds,
  });
}

/**
 * All public companies holding a specific coin, with aggregate totals.
 *
 * @param {string} coinId  "bitcoin" | "ethereum"
 */
export function getCorporateTreasury(client, coinId) {
  return client.get(`/companies/public_treasury/${coinId}`);
}

/**
 * All government entities' holdings of a specific coin.
 *
 * @param {string} coinId  "bitcoin" | "ethereum"
 */
export async function getGovernmentTreasury(client, coinId) {
  return client.get(`/governments/public_treasury/${coinId}`);
}

/**
 * Sovereign BTC holdings snapshot: all governments ranked by holdings.
 * Includes US, China, UK, North Korea, Bhutan, El Salvador, etc.
 */
export async function getSovereignBtcSnapshot(client) {
  const entities = await getEntities(client, { entityType: "government" });

  // Sequential with small delay to stay within Demo rate limits (30 req/min)
  const results = [];
  for (const e of entities) {
    try {
      results.push({ status: "fulfilled", value: await getEntityTreasury(client, e.id) });
    } catch (err) {
      results.push({ status: "rejected", reason: err });
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  const holdings = [];
  results.forEach((r, i) => {
    if (r.status !== "fulfilled") return;
    const d = r.value;
    const btc = d.holdings?.find((h) => h.coin_id === "bitcoin");
    if (!btc || !btc.amount) return;
    holdings.push({
      name: d.name,
      country: entities[i].country,
      type: d.type,
      btc: btc.amount,
      value_usd: btc.current_value_usd,
      pct_supply: btc.percentage_of_total_supply,
    });
  });

  holdings.sort((a, b) => b.btc - a.btc);

  return {
    as_of: new Date().toISOString(),
    total_sovereign_btc: holdings.reduce((s, h) => s + h.btc, 0),
    total_sovereign_value_usd: holdings.reduce((s, h) => s + (h.value_usd || 0), 0),
    holders: holdings,
  };
}

export async function getCryptoMarketSnapshot(client) {
  const [global_, defi, trending] = await Promise.all([
    getGlobalMarket(client),
    getGlobalDeFi(client),
    getTrending(client),
  ]);

  const g = global_.data;

  return {
    as_of: new Date().toISOString(),
    global: {
      total_market_cap_usd: g.total_market_cap?.usd,
      total_volume_24h_usd: g.total_volume?.usd,
      market_cap_change_24h_pct: g.market_cap_change_percentage_24h_usd,
      btc_dominance: g.market_cap_percentage?.btc,
      eth_dominance: g.market_cap_percentage?.eth,
      active_cryptocurrencies: g.active_cryptocurrencies,
      markets: g.markets,
    },
    defi: {
      defi_market_cap_usd: Number(defi.data.defi_market_cap),
      defi_dominance_pct: Number(defi.data.defi_dominance),
      defi_volume_24h_usd: Number(defi.data.trading_volume_24h),
      top_defi_coin: defi.data.top_coin_name,
      defi_to_eth_ratio: Number(defi.data.defi_to_eth_ratio),
    },
    trending_coins: trending.coins.map((c) => ({
      rank: c.item.score + 1,
      id: c.item.id,
      symbol: c.item.symbol,
      name: c.item.name,
      market_cap_rank: c.item.market_cap_rank,
      price_usd: c.item.data?.price,
      price_change_24h_pct: c.item.data?.price_change_percentage_24h?.usd,
      volume_24h: c.item.data?.total_volume,
    })),
    trending_categories: trending.categories.map((cat) => ({
      name: cat.name,
      slug: cat.slug,
      market_cap_usd: cat.data?.market_cap,
      market_cap_change_24h_pct: cat.data?.market_cap_change_percentage_24h?.usd,
    })),
  };
}
