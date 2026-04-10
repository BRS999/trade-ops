/**
 * GeckoTerminal adapter — public API.
 *
 * Usage:
 *   import { GeckoTerminalClient, getSolanaSnapshot } from './adapters/gecko-terminal/index.mjs';
 *   const client = new GeckoTerminalClient();  // no API key needed
 *   const snapshot = await getSolanaSnapshot(client);
 *
 * Primary use cases for this stack:
 *   - On-chain SOL pool liquidity and volume context
 *   - Trending pools on Solana (new opportunity discovery)
 *   - Token price verification against DEX (vs CEX price)
 *   - Pool OHLCV for on-chain entries
 */

export { GeckoTerminalClient, GeckoTerminalError } from "./client.mjs";
export {
  getTopPools, getDexPools,
  getGlobalTrendingPools, getNetworkTrendingPools,
  getGlobalNewPools, getNetworkNewPools,
  searchPools, getPool, getMultiPools,
  getPoolInfo, getPoolTrades, getPoolOhlcv,
} from "./pools.mjs";
export {
  getSimpleTokenPrice, getSimpleTokenPrices, getTokenPrice,
  getToken, getMultiTokens, getTokenInfo, getRecentlyUpdatedTokenInfo,
} from "./tokens.mjs";
export { getNetworks, getDexes } from "./networks.mjs";

import { getNetworkTrendingPools } from "./pools.mjs";
import { getSimpleTokenPrice } from "./tokens.mjs";

// Native SOL token address on Solana
const SOL_MINT = "So11111111111111111111111111111111111111112";

/**
 * Get a quick Solana on-chain snapshot:
 *   - SOL price from DEX
 *   - Top trending pools on Solana (last 24h)
 *
 * Useful as context for SOL position management.
 *
 * @param {import('./client.mjs').GeckoTerminalClient} client
 * @returns {Promise<Object>}
 */
export async function getSolanaSnapshot(client) {
  const [solPrice, trending] = await Promise.all([
    getSimpleTokenPrice(client, "solana", SOL_MINT),
    getNetworkTrendingPools(client, "solana", "24h"),
  ]);

  return {
    sol_price_usd: solPrice,
    trending_pools: trending.slice(0, 5).map((p) => ({
      name: p.name,
      address: p.address,
      dex: p.dex,
      volume_h24: p.volume_usd.h24,
      price_change_h24: p.price_change_pct.h24,
      reserve_usd: p.reserve_usd,
      txns_h24: p.txns_h24,
    })),
  };
}
