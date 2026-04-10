#!/usr/bin/env node

import {
  GeckoTerminalClient,
  getSolanaSnapshot,
  getGlobalTrendingPools,
  getNetworkTrendingPools,
  getTopPools,
  getDexPools,
  getGlobalNewPools,
  getNetworkNewPools,
  getPool,
  getMultiPools,
  getPoolInfo,
  getPoolTrades,
  getPoolOhlcv,
  getToken,
  getMultiTokens,
  getSimpleTokenPrice,
  getSimpleTokenPrices,
  getTokenInfo,
  getRecentlyUpdatedTokenInfo,
  searchPools,
  getNetworks,
  getDexes,
} from "../adapters/gecko-terminal/index.mjs";

const client = new GeckoTerminalClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    // Snapshots
    case "solana":
      print(await getSolanaSnapshot(client));
      break;

    // Pools — trending / new
    case "trending":
      print(await getGlobalTrendingPools(client, rest[0] ?? "24h"));
      break;
    case "trending-network":
      print(await getNetworkTrendingPools(client, req(rest[0], "network"), rest[1] ?? "24h"));
      break;
    case "new":
      print(await getGlobalNewPools(client));
      break;
    case "new-network":
      print(await getNetworkNewPools(client, req(rest[0], "network")));
      break;

    // Pools — top / dex
    case "top-pools":
      print(await getTopPools(client, req(rest[0], "network")));
      break;
    case "dex-pools":
      print(await getDexPools(client, req(rest[0], "network"), req(rest[1], "dex")));
      break;

    // Pool detail
    case "pool":
      print(await getPool(client, req(rest[0], "network"), req(rest[1], "address")));
      break;
    case "pool-info":
      print(await getPoolInfo(client, req(rest[0], "network"), req(rest[1], "address")));
      break;
    case "pool-trades":
      print(await getPoolTrades(client, req(rest[0], "network"), req(rest[1], "address")));
      break;
    case "ohlcv":
      // ohlcv <network> <address> [timeframe] [aggregate] [limit]
      print(await getPoolOhlcv(client, req(rest[0], "network"), req(rest[1], "address"), {
        timeframe: rest[2] ?? "hour",
        aggregate: rest[3] ? Number(rest[3]) : 1,
        limit: rest[4] ? Number(rest[4]) : 100,
      }));
      break;

    // Tokens
    case "token":
      print(await getToken(client, req(rest[0], "network"), req(rest[1], "address")));
      break;
    case "token-info":
      print(await getTokenInfo(client, req(rest[0], "network"), req(rest[1], "address")));
      break;
    case "token-price":
      print(await getSimpleTokenPrice(client, req(rest[0], "network"), req(rest[1], "address")));
      break;
    case "token-prices":
      // token-prices <network> <addr1,addr2,...>
      print(await getSimpleTokenPrices(client, req(rest[0], "network"), req(rest[1], "addresses").split(",")));
      break;
    case "recently-updated":
      print(await getRecentlyUpdatedTokenInfo(client, rest[0] ? Number(rest[0]) : 1));
      break;

    // Search
    case "search":
      print(await searchPools(client, req(rest[0], "query"), rest[1] ?? null));
      break;

    // Networks / DEXes
    case "networks":
      print(await getNetworks(client));
      break;
    case "dexes":
      print(await getDexes(client, req(rest[0], "network")));
      break;

    case "help":
    case undefined:
      printHelp();
      break;
    default:
      throw new Error(`Unknown command: ${command}. Run with 'help' for usage.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function req(value, name) {
  if (!value) throw new Error(`<${name}> is required`);
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops — GeckoTerminal

Usage: npm run gecko -- <command> [args]

Snapshots
  solana                                  SOL price + top trending pools

Trending / New
  trending [duration]                     Global trending pools (5m/1h/6h/24h)
  trending-network <network> [duration]   Network trending pools
  new                                     Global new pools
  new-network <network>                   Network new pools

Pools
  top-pools <network>                     Top pools on a network
  dex-pools <network> <dex>              Pools on a specific DEX
  pool <network> <address>               Single pool detail
  pool-info <network> <address>          Pool extended info
  pool-trades <network> <address>        Recent trades
  ohlcv <network> <address> [timeframe] [aggregate] [limit]
                                          OHLCV candles (minute/hour/day)

Tokens
  token <network> <address>              Token metadata
  token-info <network> <address>         Extended token info (social, description)
  token-price <network> <address>        Simple USD price
  token-prices <network> <addr1,addr2>   Multi-token USD prices
  recently-updated [page]                Recently updated token info

Search
  search <query> [network]               Search pools by name/symbol

Networks & DEXes
  networks                               List all supported networks
  dexes <network>                        List DEXes on a network

Networks: solana, ethereum, base, arbitrum, bsc
Duration: 5m, 1h, 6h, 24h
`);
}
