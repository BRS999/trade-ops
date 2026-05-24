#!/usr/bin/env node

import {
  DefiLlamaClient,
  getChains,
  getCryptoEcosystemSnapshot,
  getDexOverview,
  getFeesOverview,
  getProtocols,
  getStablecoinChains,
  getStablecoins,
  getYieldPools,
} from "../adapters/defillama/index.mjs";

const client = new DefiLlamaClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "chains":
      print(await getChains(client));
      break;
    case "protocols":
      print(await getProtocols(client));
      break;
    case "stablecoins":
      print(await getStablecoins(client));
      break;
    case "stablecoin-chains":
      print(await getStablecoinChains(client));
      break;
    case "dexs":
      print(await getDexOverview(client, { chain: rest[0] }));
      break;
    case "fees":
      print(await getFeesOverview(client, { chain: rest[0] }));
      break;
    case "yields":
      print(await getYieldPools(client));
      break;
    case "snapshot":
      print(await getCryptoEcosystemSnapshot(client, parseOptions(rest)));
      break;
    case "help":
    case undefined:
      printHelp();
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--limit") options.limit = Number(req(args[++index], "limit"));
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function req(value, name) {
  if (!value) throw new Error(`<${name}> is required`);
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops — DeFiLlama

Usage: npm run defillama -- <command> [args]

Commands:
  chains                         Chain TVL list
  protocols                      Protocol TVL list
  stablecoins                    Stablecoin supply list
  stablecoin-chains              Stablecoin supply by chain
  dexs [chain]                   DEX volume overview
  fees [chain]                   Fee/revenue overview
  yields                         Yield pool list
  snapshot [--limit 12]          Compact ecosystem snapshot

Examples:
  npm run defillama -- snapshot --limit 10
  npm run defillama -- dexs Solana
`);
}
