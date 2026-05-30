#!/usr/bin/env node

import {
  EiaClient,
  getBrentPrice,
  getCrudeProduction,
  getCrudeSpotPrices,
  getCrudeStocks,
  getEnergySnapshot,
  getNatGasStorage,
  getSprStocks,
  getWtiPrice,
} from "../adapters/eia/index.mjs";

const client = new EiaClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "snapshot":
      print(await getEnergySnapshot(client));
      break;
    case "wti":
      print(await getWtiPrice(client, parseOptions(rest)));
      break;
    case "brent":
      print(await getBrentPrice(client, parseOptions(rest)));
      break;
    case "crude-prices":
      print(await getCrudeSpotPrices(client, parseOptions(rest)));
      break;
    case "crude-stocks":
      print(await getCrudeStocks(client, parseOptions(rest)));
      break;
    case "spr":
      print(await getSprStocks(client, parseOptions(rest)));
      break;
    case "natgas-storage":
      print(await getNatGasStorage(client, parseOptions(rest)));
      break;
    case "production":
      print(await getCrudeProduction(client, parseOptions(rest)));
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
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = args[i + 1];
    if (!next || next.startsWith("--")) {
      opts[key] = true;
    } else {
      opts[key] = isNaN(Number(next)) ? next : Number(next);
      i++;
    }
  }
  return opts;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops EIA Tool

Usage:
  node tools/eia.mjs snapshot                          # WTI/Brent + crude stocks + nat gas
  node tools/eia.mjs wti [--limit 10] [--start YYYY-MM-DD] [--end YYYY-MM-DD]
  node tools/eia.mjs brent [--limit 10]
  node tools/eia.mjs crude-prices [--limit 5]          # WTI + Brent together
  node tools/eia.mjs crude-stocks [--limit 8]          # Weekly inventory excl. SPR
  node tools/eia.mjs spr [--limit 8]                   # Strategic Petroleum Reserve
  node tools/eia.mjs natgas-storage [--limit 8]        # Weekly working gas in storage
  node tools/eia.mjs production [--limit 6]            # US crude production

Key releases:
  Crude inventory  — every Wednesday ~10:30am ET (Weekly Petroleum Status Report)
  Nat gas storage  — every Thursday  ~10:30am ET (Natural Gas Storage Report)
`);
}
