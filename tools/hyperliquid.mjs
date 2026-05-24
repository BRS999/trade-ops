#!/usr/bin/env node

import {
  HyperliquidClient,
  getAllMids,
  getMetaAndAssetContexts,
  getPerpPositioningSnapshot,
} from "../adapters/hyperliquid/index.mjs";

const client = new HyperliquidClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "mids":
      print(await getAllMids(client));
      break;
    case "meta":
      print(await getMetaAndAssetContexts(client));
      break;
    case "snapshot":
      print(await getPerpPositioningSnapshot(client, parseSymbols(rest[0]), parseOptions(rest.slice(1))));
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

function parseSymbols(value) {
  return value ? value.split(",").map((symbol) => symbol.trim()).filter(Boolean) : undefined;
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
  console.log(`Trade Ops — Hyperliquid

Usage: npm run hyperliquid -- <command> [args]

Commands:
  mids                              All mid prices
  meta                              Raw perpetual metadata + asset contexts
  snapshot [BTC,ETH,SOL]            Funding, OI, volume, mark-price snapshot

Examples:
  npm run hyperliquid -- snapshot BTC,ETH,SOL
`);
}
