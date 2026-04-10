/**
 * DexScreener adapter — public API.
 *
 * Usage:
 *   import { DexScreenerClient, searchPairs } from './adapters/dexscreener/index.mjs';
 *   const client = new DexScreenerClient();  // no API key needed
 *
 * Primary use cases:
 *   - Cross-chain pair search and price lookup
 *   - Liquidity and volume screening
 *   - Boosted/trending token discovery
 *   - Token order/promotion activity
 */

export { DexScreenerClient, DexScreenerError } from "./client.mjs";
export { searchPairs, getPair, getPairsByTokens } from "./pairs.mjs";
export { getLatestTokenProfiles, getLatestBoostedTokens, getTopBoostedTokens, getTokenOrders } from "./tokens.mjs";
