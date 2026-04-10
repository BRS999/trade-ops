/**
 * DexScreener token profile and boost endpoints.
 *
 * getLatestTokenProfiles(client, limit)   → recently updated token profiles
 * getLatestBoostedTokens(client, limit)   → recently boosted tokens
 * getTopBoostedTokens(client, limit)      → tokens with most active boosts
 * getTokenOrders(client, chain, token, limit) → paid orders for a token
 */

/**
 * @param {import('./client.mjs').DexScreenerClient} client
 * @param {number} [limit=20]
 * @returns {Promise<Object[]>}
 */
export async function getLatestTokenProfiles(client, limit = 20) {
  const data = await client.get("/token-profiles/latest/v1");
  return (Array.isArray(data) ? data : []).slice(0, limit);
}

/**
 * @param {import('./client.mjs').DexScreenerClient} client
 * @param {number} [limit=20]
 * @returns {Promise<Object[]>}
 */
export async function getLatestBoostedTokens(client, limit = 20) {
  const data = await client.get("/token-boosts/latest/v1");
  return (Array.isArray(data) ? data : []).slice(0, limit);
}

/**
 * @param {import('./client.mjs').DexScreenerClient} client
 * @param {number} [limit=20]
 * @returns {Promise<Object[]>}
 */
export async function getTopBoostedTokens(client, limit = 20) {
  const data = await client.get("/token-boosts/top/v1");
  return (Array.isArray(data) ? data : []).slice(0, limit);
}

/**
 * Get paid orders (boosts, ads) placed for a token.
 *
 * @param {import('./client.mjs').DexScreenerClient} client
 * @param {string} chain   e.g. "solana"
 * @param {string} tokenAddress
 * @param {number} [limit=20]
 * @returns {Promise<Object[]>}
 */
export async function getTokenOrders(client, chain, tokenAddress, limit = 20) {
  const data = await client.get(`/orders/v1/${encodeURIComponent(chain)}/${encodeURIComponent(tokenAddress)}`);
  return (Array.isArray(data) ? data : []).slice(0, limit);
}
