/**
 * DeFiLlama adapter — public read API.
 *
 * Primary use cases:
 *   - Chain TVL / protocol rotation
 *   - Stablecoin supply and chain distribution context
 *   - DEX volume and fee/revenue regime context
 */

export { DefiLlamaClient, DefiLlamaError } from "./client.mjs";

export function getProtocols(client) {
  return client.llama("protocols");
}

export function getChains(client) {
  return client.llama("v2/chains");
}

export function getDexOverview(client, options = {}) {
  const chain = options.chain ? `/${encodeURIComponent(options.chain)}` : "";
  return client.llama(`overview/dexs${chain}`, { excludeTotalDataChart: true, excludeTotalDataChartBreakdown: true });
}

export function getFeesOverview(client, options = {}) {
  const chain = options.chain ? `/${encodeURIComponent(options.chain)}` : "";
  return client.llama(`overview/fees${chain}`, { excludeTotalDataChart: true, excludeTotalDataChartBreakdown: true });
}

export function getStablecoins(client, options = {}) {
  return client.stablecoins("stablecoins", { includePrices: options.includePrices ?? true });
}

export function getStablecoinChains(client) {
  return client.stablecoins("stablecoinchains");
}

export function getYieldPools(client) {
  return client.yields("pools");
}

export async function getCryptoEcosystemSnapshot(client, options = {}) {
  const [chains, protocols, stablecoinChains, dexOverview, feesOverview] = await Promise.all([
    getChains(client),
    getProtocols(client),
    getStablecoinChains(client),
    getDexOverview(client),
    getFeesOverview(client),
  ]);

  return {
    as_of: new Date().toISOString(),
    source: "defillama",
    chains: summarizeChains(chains, options),
    protocols: summarizeProtocols(protocols, options),
    stablecoins: summarizeStablecoinChains(stablecoinChains, options),
    dex_volume: summarizeOverview(dexOverview, options),
    fees: summarizeOverview(feesOverview, options),
  };
}

function summarizeChains(chains, options) {
  const rows = ensureArray(chains).map((chain) => ({
    name: chain.name,
    tvl: number(chain.tvl),
    change_1d: number(chain.change_1d),
    change_7d: number(chain.change_7d),
    change_1m: number(chain.change_1m),
  }));

  return {
    count: rows.length,
    top_by_tvl: [...rows].sort((a, b) => b.tvl - a.tvl).slice(0, options.limit ?? 12),
    top_7d_gainers: [...rows].filter((row) => row.tvl > 100_000_000 && row.change_7d !== 0).sort((a, b) => b.change_7d - a.change_7d).slice(0, options.limit ?? 12),
    top_7d_losers: [...rows].filter((row) => row.tvl > 100_000_000 && row.change_7d !== 0).sort((a, b) => a.change_7d - b.change_7d).slice(0, options.limit ?? 12),
  };
}

function summarizeProtocols(protocols, options) {
  const rows = ensureArray(protocols).map((protocol) => ({
    name: protocol.name,
    category: protocol.category ?? null,
    chain: protocol.chain ?? null,
    tvl: number(protocol.tvl),
    change_1d: number(protocol.change_1d),
    change_7d: number(protocol.change_7d),
    change_1m: number(protocol.change_1m),
  }));

  return {
    count: rows.length,
    top_by_tvl: [...rows].sort((a, b) => b.tvl - a.tvl).slice(0, options.limit ?? 12),
    top_7d_gainers: [...rows].filter((row) => row.tvl > 50_000_000).sort((a, b) => b.change_7d - a.change_7d).slice(0, options.limit ?? 12),
  };
}

function summarizeStablecoinChains(stablecoinChains, options) {
  const rows = ensureArray(stablecoinChains).map((chain) => ({
    chain: chain.name ?? chain.chain ?? null,
    circulating: number(chain.totalCirculatingUSD?.peggedUSD ?? chain.circulating?.peggedUSD ?? chain.circulating),
    change_1d: number(chain.change_1d),
    change_7d: number(chain.change_7d),
    change_1m: number(chain.change_1m),
  }));

  return {
    count: rows.length,
    top_by_supply: [...rows].sort((a, b) => b.circulating - a.circulating).slice(0, options.limit ?? 12),
    top_7d_gainers: [...rows].filter((row) => row.circulating > 50_000_000 && row.change_7d !== 0).sort((a, b) => b.change_7d - a.change_7d).slice(0, options.limit ?? 12),
  };
}

function summarizeOverview(overview, options) {
  const protocols = ensureArray(overview?.protocols).map((row) => ({
    name: row.name,
    category: row.category ?? null,
    total_24h: number(row.total24h),
    total_7d: number(row.total7d),
    change_1d: number(row.change_1d),
    change_7d: number(row.change_7d),
  }));

  return {
    total_24h: number(overview?.total24h),
    total_7d: number(overview?.total7d),
    top_24h: [...protocols].sort((a, b) => b.total_24h - a.total_24h).slice(0, options.limit ?? 12),
    top_7d_gainers: [...protocols].filter((row) => row.total_24h > 1_000_000).sort((a, b) => b.change_7d - a.change_7d).slice(0, options.limit ?? 12),
  };
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
