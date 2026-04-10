#!/usr/bin/env node

import {
  DexScreenerClient,
  searchPairs,
  getPair,
  getPairsByTokens,
  getLatestTokenProfiles,
  getLatestBoostedTokens,
  getTopBoostedTokens,
  getTokenOrders,
} from "../adapters/dexscreener/index.mjs";

const client = new DexScreenerClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "search":
      print(await searchPairs(client, req(rest[0], "query"), rest[1] ? Number(rest[1]) : 20));
      break;
    case "pair":
      print(await getPair(client, req(rest[0], "chain"), req(rest[1], "pairAddress")));
      break;
    case "pairs-by-tokens":
      // pairs-by-tokens <addr1,addr2,...> [limit]
      print(await getPairsByTokens(client, req(rest[0], "tokenAddresses"), rest[1] ? Number(rest[1]) : 20));
      break;
    case "latest-profiles":
      print(await getLatestTokenProfiles(client, rest[0] ? Number(rest[0]) : 20));
      break;
    case "latest-boosted":
      print(await getLatestBoostedTokens(client, rest[0] ? Number(rest[0]) : 20));
      break;
    case "top-boosted":
      print(await getTopBoostedTokens(client, rest[0] ? Number(rest[0]) : 20));
      break;
    case "orders":
      print(await getTokenOrders(client, req(rest[0], "chain"), req(rest[1], "tokenAddress"), rest[2] ? Number(rest[2]) : 20));
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
  console.log(`Trade Ops — DexScreener

Usage: npm run dex -- <command> [args]

Pairs
  search <query> [limit]                     Search pairs by name/symbol/address
  pair <chain> <pairAddress>                 Single pair detail
  pairs-by-tokens <addr1,addr2> [limit]      Pairs for one or more token addresses

Tokens & Boosts
  latest-profiles [limit]                    Recently updated token profiles
  latest-boosted [limit]                     Recently boosted tokens
  top-boosted [limit]                        Tokens with most active boosts
  orders <chain> <tokenAddress> [limit]      Paid orders/boosts for a token

Chains: solana, ethereum, base, arbitrum, bsc, etc.

Examples:
  npm run dex -- search "SOL/USDC" 5
  npm run dex -- pair solana <pairAddress>
  npm run dex -- top-boosted 10
  npm run dex -- orders solana <tokenAddress>
`);
}
