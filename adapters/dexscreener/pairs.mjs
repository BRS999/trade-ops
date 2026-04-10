/**
 * DexScreener pair endpoints.
 *
 * searchPairs(client, query, limit)              → search pairs by name/symbol/address
 * getPair(client, chain, pairAddress)            → single pair detail
 * getPairsByTokens(client, tokenAddresses, limit) → pairs for one or more token addresses
 */

function parsePair(p) {
  if (!p) return null;
  return {
    chain: p.chainId ?? null,
    dex: p.dexId ?? null,
    pair_address: p.pairAddress ?? null,
    base_token: {
      address: p.baseToken?.address ?? null,
      symbol: p.baseToken?.symbol ?? null,
      name: p.baseToken?.name ?? null,
    },
    quote_token: {
      address: p.quoteToken?.address ?? null,
      symbol: p.quoteToken?.symbol ?? null,
      name: p.quoteToken?.name ?? null,
    },
    price_native: p.priceNative ? Number(p.priceNative) : null,
    price_usd: p.priceUsd ? Number(p.priceUsd) : null,
    price_change_pct: {
      m5:  p.priceChange?.m5  ?? null,
      h1:  p.priceChange?.h1  ?? null,
      h6:  p.priceChange?.h6  ?? null,
      h24: p.priceChange?.h24 ?? null,
    },
    volume_usd: {
      m5:  p.volume?.m5  ?? null,
      h1:  p.volume?.h1  ?? null,
      h6:  p.volume?.h6  ?? null,
      h24: p.volume?.h24 ?? null,
    },
    liquidity_usd: p.liquidity?.usd ?? null,
    liquidity_base: p.liquidity?.base ?? null,
    liquidity_quote: p.liquidity?.quote ?? null,
    fdv: p.fdv ?? null,
    market_cap: p.marketCap ?? null,
    pair_created_at: p.pairCreatedAt ?? null,
    url: p.url ?? null,
  };
}

/**
 * Search pairs by name, symbol, or address.
 *
 * @param {import('./client.mjs').DexScreenerClient} client
 * @param {string} query
 * @param {number} [limit=20]
 * @returns {Promise<Object[]>}
 */
export async function searchPairs(client, query, limit = 20) {
  const data = await client.get("/latest/dex/search", { q: query });
  return (data.pairs ?? []).slice(0, limit).map(parsePair);
}

/**
 * Get a single pair by chain and pair address.
 *
 * @param {import('./client.mjs').DexScreenerClient} client
 * @param {string} chain   e.g. "solana", "ethereum"
 * @param {string} pairAddress
 * @returns {Promise<Object|null>}
 */
export async function getPair(client, chain, pairAddress) {
  const data = await client.get(`/latest/dex/pairs/${encodeURIComponent(chain)}/${encodeURIComponent(pairAddress)}`);
  const pair = data.pairs?.[0] ?? data.pair ?? null;
  return pair ? parsePair(pair) : null;
}

/**
 * Get pairs for one or more token addresses (comma-separated or array).
 *
 * @param {import('./client.mjs').DexScreenerClient} client
 * @param {string|string[]} tokenAddresses
 * @param {number} [limit=20]
 * @returns {Promise<Object[]>}
 */
export async function getPairsByTokens(client, tokenAddresses, limit = 20) {
  const joined = Array.isArray(tokenAddresses) ? tokenAddresses.join(",") : tokenAddresses;
  const data = await client.get(`/latest/dex/tokens/${encodeURIComponent(joined)}`);
  return (data.pairs ?? []).slice(0, limit).map(parsePair);
}
