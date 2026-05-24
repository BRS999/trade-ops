#!/usr/bin/env node

import {
  KrakenClient,
  getAssetPairs,
  getOhlc,
  getOrderBook,
  getSpotSnapshot,
  getTicker,
} from "../adapters/kraken/index.mjs";

const client = new KrakenClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "pairs":
      print(await getAssetPairs(client, rest[0]));
      break;
    case "ticker":
      print(await getTicker(client, req(rest[0], "pair")));
      break;
    case "book":
      print(await getOrderBook(client, req(rest[0], "pair"), parseOptions(rest.slice(1))));
      break;
    case "ohlc":
      print(await getOhlc(client, req(rest[0], "pair"), parseOptions(rest.slice(1))));
      break;
    case "snapshot":
      print(await getSpotSnapshot(client, parseList(rest[0]) ?? ["XBTUSD", "ETHUSD", "SOLUSD"]));
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
    if (arg === "--count") options.count = Number(req(args[++index], "count"));
    else if (arg === "--interval") options.interval = Number(req(args[++index], "interval"));
    else if (arg === "--since") options.since = req(args[++index], "since");
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
  console.log(`Trade Ops — Kraken Public Market Data

Usage: npm run kraken -- <command> [args]

Commands:
  pairs [pair]
  ticker <pair>
  book <pair> [--count 50]
  ohlc <pair> [--interval 60] [--since unix]
  snapshot [XBTUSD,ETHUSD,SOLUSD]
`);
}
