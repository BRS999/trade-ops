#!/usr/bin/env node

import {
  BinanceFuturesClient,
  BinanceSpotClient,
  getFundingRateHistory,
  getFuturesPositioningSnapshot,
  getGlobalLongShortAccountRatio,
  getOpenInterest,
  getOpenInterestHistory,
  getPremiumIndex,
  getSpot24hr,
  getSpotAvgPrice,
  getSpotBookTicker,
  getSpotKlines,
  getSpotOrderBook,
  getSpotPrice,
  getSpotSnapshot,
  getSpotTicker,
  getTakerLongShortRatio,
} from "../adapters/binance-futures/index.mjs";

const futuresClient = new BinanceFuturesClient();
const spotClient = new BinanceSpotClient();
const client = futuresClient; // default for existing futures commands
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

    // ── Spot ────────────────────────────────────────────────────────────
    case "spot-price":
      print(await getSpotPrice(spotClient, rest[0]));
      break;
    case "spot-24hr":
      print(await getSpot24hr(spotClient, rest[0]));
      break;
    case "spot-book":
      print(await getSpotBookTicker(spotClient, rest[0]));
      break;
    case "spot-avg":
      print(await getSpotAvgPrice(spotClient, req(rest[0], "symbol")));
      break;
    case "spot-depth":
      print(await getSpotOrderBook(spotClient, req(rest[0], "symbol"), rest[1] ? Number(rest[1]) : 20));
      break;
    case "spot-klines":
      print(await getSpotKlines(spotClient, req(rest[0], "symbol"), parseKlineOptions(rest.slice(1))));
      break;
    case "spot-ticker":
      print(await getSpotTicker(spotClient, req(rest[0], "symbol"), rest[1] ?? "1h"));
      break;
    case "spot-snapshot":
      print(await getSpotSnapshot(spotClient, parseSymbols(rest[0]) ?? ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"]));
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

function parseKlineOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--interval") options.interval = req(args[++i], "interval");
    else if (args[i] === "--limit") options.limit = Number(req(args[++i], "limit"));
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
  console.log(`Trade Ops — Binance Futures + Spot

Usage: npm run binance-futures -- <command> [args]

Futures (fapi.binance.com):
  premium <symbol>                         Mark price, index price, funding rate
  open-interest <symbol>                   Current open interest
  funding <symbol> [--limit 24]            Funding-rate history
  oi-history <symbol> [--period 15m]       Open-interest history
  long-short <symbol> [--period 15m]       Global long/short account ratio
  taker-flow <symbol> [--period 15m]       Taker buy/sell volume ratio
  snapshot [BTCUSDT,ETHUSDT,SOLUSDT]       Compact positioning snapshot

Spot (data-api.binance.vision):
  spot-price [symbol]                      Latest price (all symbols if omitted)
  spot-24hr [symbol]                       24h stats: change, high, low, volume
  spot-book [symbol]                       Best bid/ask + quantities
  spot-avg <symbol>                        5-minute average price
  spot-depth <symbol> [limit]              Order book depth (default 20 levels)
  spot-klines <symbol> [--interval 1h] [--limit 24]   OHLCV candles
  spot-ticker <symbol> [windowSize]        Rolling window stats (default 1h)
  spot-snapshot [BTCUSDT,ETHUSDT,...]      Price + 24h + spread for each symbol

Examples:
  npm run binance-futures -- spot-snapshot BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT
  npm run binance-futures -- spot-klines BTCUSDT --interval 4h --limit 48
  npm run binance-futures -- spot-depth BTCUSDT 50
  npm run binance-futures -- snapshot BTCUSDT,ETHUSDT,SOLUSDT
`);
}
