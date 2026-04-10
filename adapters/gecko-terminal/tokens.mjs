/**
 * GeckoTerminal token data.
 *
 * getSimpleTokenPrice(client, network, address)         → single token USD price
 * getSimpleTokenPrices(client, network, addresses[])    → multi-token USD prices
 * getToken(client, network, address)                    → token metadata + price
 * getMultiTokens(client, network, addresses[])          → multiple tokens
 * getTokenInfo(client, network, address)                → extended token info (social, description)
 * getRecentlyUpdatedTokenInfo(client, page)             → recently updated token info
 * searchPools(client, query, network?)                  → search pools by name/symbol
 */

function parseToken(item) {
  const a = item.attributes ?? {};
  return {
    address: a.address ?? item.id,
    name: a.name ?? null,
    symbol: a.symbol ?? null,
    decimals: a.decimals ?? null,
    price_usd: a.price_usd ? Number(a.price_usd) : null,
    fdv_usd: a.fdv_usd ? Number(a.fdv_usd) : null,
    market_cap_usd: a.market_cap_usd ? Number(a.market_cap_usd) : null,
    volume_usd_h24: a.volume_usd?.h24 ? Number(a.volume_usd.h24) : null,
    total_reserve_usd: a.total_reserve_in_usd ? Number(a.total_reserve_in_usd) : null,
    coingecko_coin_id: a.coingecko_coin_id ?? null,
    network: item.relationships?.network?.data?.id ?? null,
  };
}

/**
 * Fetch simple token price in USD (single address).
 *
 * @param {import('./client.mjs').GeckoTerminalClient} client
 * @param {string} network
 * @param {string} address   Token contract address
 * @returns {Promise<number|null>}
 */
export async function getSimpleTokenPrice(client, network, address) {
  const data = await client.get(
    `simple/networks/${network}/token_price/${address}`
  );
  const prices = data?.data?.attributes?.token_prices ?? {};
  const raw = prices[address.toLowerCase()] ?? prices[address];
  return raw ? Number(raw) : null;
}

// Legacy alias
export const getTokenPrice = getSimpleTokenPrice;

/**
 * Fetch simple token prices in USD (multiple addresses).
 *
 * @param {import('./client.mjs').GeckoTerminalClient} client
 * @param {string} network
 * @param {string[]} addresses
 * @returns {Promise<Record<string, number|null>>}
 */
export async function getSimpleTokenPrices(client, network, addresses) {
  const data = await client.get(
    `simple/networks/${network}/token_price/${addresses.join(",")}`
  );
  const prices = data?.data?.attributes?.token_prices ?? {};
  return Object.fromEntries(
    addresses.map((addr) => {
      const raw = prices[addr.toLowerCase()] ?? prices[addr];
      return [addr, raw ? Number(raw) : null];
    })
  );
}

/**
 * Fetch single token (name, symbol, decimals, price, volume, market cap).
 *
 * @param {import('./client.mjs').GeckoTerminalClient} client
 * @param {string} network
 * @param {string} address
 * @returns {Promise<Object>}
 */
export async function getToken(client, network, address) {
  const data = await client.get(`networks/${network}/tokens/${address}`);
  return parseToken(data.data);
}

/**
 * Fetch multiple tokens by address.
 *
 * @param {import('./client.mjs').GeckoTerminalClient} client
 * @param {string} network
 * @param {string[]} addresses
 * @returns {Promise<Object[]>}
 */
export async function getMultiTokens(client, network, addresses) {
  const data = await client.get(
    `networks/${network}/tokens/multi/${addresses.join(",")}`
  );
  return (data.data ?? []).map(parseToken);
}

/**
 * Fetch extended token info (description, websites, social links, image).
 *
 * @param {import('./client.mjs').GeckoTerminalClient} client
 * @param {string} network
 * @param {string} address
 * @returns {Promise<Object|null>}
 */
export async function getTokenInfo(client, network, address) {
  const data = await client.get(`networks/${network}/tokens/${address}/info`);
  return data.data ?? null;
}

/**
 * Fetch recently updated tokens info list.
 *
 * @param {import('./client.mjs').GeckoTerminalClient} client
 * @param {number} [page=1]
 * @returns {Promise<Object[]>}
 */
export async function getRecentlyUpdatedTokenInfo(client, page = 1) {
  const data = await client.get("tokens/info_recently_updated", { page });
  return data.data ?? [];
}

/**
 * Search for pools by token name, symbol, or address.
 *
 * @param {import('./client.mjs').GeckoTerminalClient} client
 * @param {string} query
 * @param {Object} [options]
 * @param {string} [options.network]   Narrow to one network
 * @param {number} [options.page=1]
 * @returns {Promise<Object[]>}
 */
export async function searchPools(client, query, options = {}) {
  const { network, page = 1 } = options;
  const params = { query, page: String(page) };
  if (network) params.network = network;

  const data = await client.get("search/pools", params);
  return (data.data ?? []).map((item) => {
    const a = item.attributes ?? {};
    return {
      address: a.address ?? item.id,
      name: a.name ?? null,
      network: item.relationships?.network?.data?.id ?? null,
      dex: item.relationships?.dex?.data?.id ?? null,
      price_usd: a.base_token_price_usd ? Number(a.base_token_price_usd) : null,
      volume_h24: a.volume_usd?.h24 ? Number(a.volume_usd.h24) : null,
      reserve_usd: a.reserve_in_usd ? Number(a.reserve_in_usd) : null,
    };
  });
}
