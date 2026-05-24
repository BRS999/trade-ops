#!/usr/bin/env node

import {
  CoinbaseClient,
  getProduct,
  getProductBook,
  getProductCandles,
  getSpotSnapshot,
  listProducts,
} from "../adapters/coinbase/index.mjs";

const client = new CoinbaseClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "products":
      print(await listProducts(client, parseOptions(rest)));
      break;
    case "product":
      print(await getProduct(client, req(rest[0], "productId")));
      break;
    case "book":
      print(await getProductBook(client, req(rest[0], "productId"), parseOptions(rest.slice(1))));
      break;
    case "candles":
      print(await getProductCandles(client, req(rest[0], "productId"), parseOptions(rest.slice(1))));
      break;
    case "snapshot":
      print(await getSpotSnapshot(client, parseList(rest[0]) ?? ["BTC-USD", "ETH-USD", "SOL-USD"]));
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
    else if (arg === "--granularity") options.granularity = req(args[++index], "granularity");
    else if (arg === "--start") options.start = req(args[++index], "start");
    else if (arg === "--end") options.end = req(args[++index], "end");
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function parseList(value) {
  return value ? value.split(",").map((entry) => entry.trim()).filter(Boolean) : null;
}

function req(value, name) {
  if (!value) throw new Error(`<${name}> is required`);
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops — Coinbase Public Market Data

Usage: npm run coinbase -- <command> [args]

Commands:
  products [--limit 100]
  product <productId>
  book <productId> [--limit 50]
  candles <productId> [--granularity ONE_HOUR] [--start ISO] [--end ISO]
  snapshot [BTC-USD,ETH-USD,SOL-USD]
`);
}
