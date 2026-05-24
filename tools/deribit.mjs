#!/usr/bin/env node

import {
  DeribitClient,
  getBookSummaryByCurrency,
  getInstruments,
  getOptionsSnapshot,
  getOrderBook,
  getVolatilityIndex,
} from "../adapters/deribit/index.mjs";

const client = new DeribitClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "instruments":
      print(await getInstruments(client, parseOptions(rest)));
      break;
    case "summary":
      print(await getBookSummaryByCurrency(client, parseOptions(rest)));
      break;
    case "orderbook":
      print(await getOrderBook(client, req(rest[0], "instrumentName"), parseOptions(rest.slice(1))));
      break;
    case "vol-index":
      print(await getVolatilityIndex(client, rest[0] ?? "BTC"));
      break;
    case "options-snapshot":
      print(await getOptionsSnapshot(client, parseList(rest[0]) ?? ["BTC", "ETH"]));
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
    if (arg === "--currency") options.currency = req(args[++index], "currency");
    else if (arg === "--kind") options.kind = req(args[++index], "kind");
    else if (arg === "--depth") options.depth = Number(req(args[++index], "depth"));
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
  console.log(`Trade Ops — Deribit

Usage: npm run deribit -- <command> [args]

Commands:
  instruments [--currency BTC] [--kind option|future]
  summary [--currency BTC] [--kind option|future]
  orderbook <instrumentName> [--depth 10]
  vol-index [BTC|ETH]
  options-snapshot [BTC,ETH]
`);
}
