/**
 * GeckoTerminal network and DEX endpoints.
 *
 * getNetworks(client, page)          → list all supported networks
 * getDexes(client, network, page)    → list DEXes on a network
 */

/**
 * List all supported networks.
 *
 * @param {import('./client.mjs').GeckoTerminalClient} client
 * @param {number} [page=1]
 * @returns {Promise<Object[]>}
 */
export async function getNetworks(client, page = 1) {
  const data = await client.get("networks", { page });
  return (data.data ?? []).map((item) => {
    const a = item.attributes ?? {};
    return {
      id: item.id,
      name: a.name ?? null,
      coingecko_asset_platform_id: a.coingecko_asset_platform_id ?? null,
    };
  });
}

/**
 * List DEXes on a given network.
 *
 * @param {import('./client.mjs').GeckoTerminalClient} client
 * @param {string} network
 * @param {number} [page=1]
 * @returns {Promise<Object[]>}
 */
export async function getDexes(client, network, page = 1) {
  const data = await client.get(`networks/${network}/dexes`, { page });
  return (data.data ?? []).map((item) => {
    const a = item.attributes ?? {};
    return {
      id: item.id,
      name: a.name ?? null,
    };
  });
}
