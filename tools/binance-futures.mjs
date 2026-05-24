#!/usr/bin/env node

import {
  BinanceFuturesClient,
  getFundingRateHistory,
  getFuturesPositioningSnapshot,
  getGlobalLongShortAccountRatio,
  getOpenInterest,
  getOpenInterestHistory,
  getPremiumIndex,
  getTakerLongShortRatio,
} from "../adapters/binance-futures/index.mjs";

const client = new BinanceFuturesClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "premium":
      print(await getPremiumIndex(client, req(rest[0], "symbol")));
      break;
    case "open-interest":
      print(await getOpenInterest(client, req(rest[0], "symbol")));
      break;
    case "funding":
      print(await getFundingRateHistory(client, { symbol: req(rest[0], "symbol"), ...parseOptions(rest.slice(1)) }));
      break;
    case "oi-history":
      print(await getOpenInterestHistory(client, { symbol: req(rest[0], "symbol"), ...parseOptions(rest.slice(1)) }));
      break;
    case "long-short":
      print(await getGlobalLongShortAccountRatio(client, { symbol: req(rest[0], "symbol"), ...parseOptions(rest.slice(1)) }));
      break;
    case "taker-flow":
      print(await getTakerLongShortRatio(client, { symbol: req(rest[0], "symbol"), ...parseOptions(rest.slice(1)) }));
      break;
    case "snapshot":
      print(await getFuturesPositioningSnapshot(client, parseSymbols(rest[0]), parseOptions(rest.slice(1))));
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
    if (arg === "--period") options.period = req(args[++index], "period");
    else if (arg === "--limit") options.limit = Number(req(args[++index], "limit"));
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function parseSymbols(value) {
  return value ? value.split(",").map((symbol) => symbol.trim()).filter(Boolean) : undefined;
}

function req(value, name) {
  if (!value) throw new Error(`<${name}> is required`);
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops — Binance USD-M Futures

Usage: npm run binance-futures -- <command> [args]

Commands:
  premium <symbol>                         Mark price, index price, funding
  open-interest <symbol>                   Current open interest
  funding <symbol> [--limit 24]            Funding-rate history
  oi-history <symbol> [--period 15m]       Open-interest history
  long-short <symbol> [--period 15m]       Global long/short account ratio
  taker-flow <symbol> [--period 15m]       Taker buy/sell volume ratio
  snapshot [BTCUSDT,ETHUSDT,SOLUSDT]       Compact positioning snapshot

Examples:
  npm run binance-futures -- snapshot BTCUSDT,ETHUSDT,SOLUSDT --period 15m --limit 24
  npm run binance-futures -- funding BTCUSDT --limit 10
`);
}
