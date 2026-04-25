#!/usr/bin/env node

import {
  KalshiClient,
  getEvent,
  getExchangeStatus,
  getMarket,
  getOrderbook,
  listEvents,
  listMarkets,
  listSeries,
  listTrades,
} from "../adapters/kalshi/index.mjs";

const client = new KalshiClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "status":
      print(await getExchangeStatus(client));
      break;
    case "markets":
      print(await listMarkets(client, parseOptions(rest)));
      break;
    case "market":
      print(await getMarket(client, requireOption(rest, "--ticker", "ticker")));
      break;
    case "orderbook":
      print(await getOrderbook(client, requireOption(rest, "--ticker", "ticker"), parseOptions(rest)));
      break;
    case "trades":
      print(await listTrades(client, parseOptions(rest)));
      break;
    case "events":
      print(await listEvents(client, parseOptions(rest)));
      break;
    case "event":
      print(await getEvent(client, requireOption(rest, "--event", "event")));
      break;
    case "series":
      print(await listSeries(client, parseOptions(rest)));
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
    if (!arg.startsWith("--")) {
      throw new Error(`Unknown positional argument: ${arg}`);
    }

    const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = args[index + 1];

    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }

    options[key] = parseValue(next);
    index += 1;
  }

  return options;
}

function requireOption(args, flag, name) {
  const index = args.indexOf(flag);
  if (index === -1 || !args[index + 1] || args[index + 1].startsWith("--")) {
    throw new Error(`${name} is required`);
  }
  return args[index + 1];
}

function parseValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && String(numeric) === value ? numeric : value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops Kalshi Tool

Usage:
  node tools/kalshi.mjs status
  node tools/kalshi.mjs markets [--limit 100] [--status open] [--series KXBTC] [--event <event_ticker>] [--cursor <cursor>]
  node tools/kalshi.mjs market --ticker <market_ticker>
  node tools/kalshi.mjs orderbook --ticker <market_ticker> [--depth 50]
  node tools/kalshi.mjs trades [--ticker <market_ticker>] [--limit 100] [--cursor <cursor>] [--min-ts <unix>] [--max-ts <unix>]
  node tools/kalshi.mjs events [--limit 100] [--status open] [--series <series_ticker>] [--cursor <cursor>]
  node tools/kalshi.mjs event --event <event_ticker>
  node tools/kalshi.mjs series [--limit 400] [--category Economics] [--cursor <cursor>]

Examples:
  node tools/kalshi.mjs status
  node tools/kalshi.mjs markets --status open --limit 100
  node tools/kalshi.mjs markets --series KXBTC --status open
  node tools/kalshi.mjs orderbook --ticker <market_ticker> --depth 50
`);
}
