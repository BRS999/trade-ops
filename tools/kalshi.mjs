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
    case "scan":
      print(summarizeScan(await listMarkets(client, parseOptionsWithDefaults(rest, { status: "open", limit: 1000 }))));
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

function parseOptionsWithDefaults(args, defaults) {
  return { ...defaults, ...parseOptions(args) };
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

function summarizeScan(data) {
  const markets = data.markets ?? [];
  const rows = markets.map(normalizeMarket);
  const activeSpreadMarkets = rows.filter((market) =>
    market.yes_bid != null &&
    market.yes_ask != null &&
    market.yes_bid > 0 &&
    market.yes_ask > 0 &&
    market.yes_ask >= market.yes_bid
  );

  return {
    cursor: data.cursor ?? null,
    scanned: rows.length,
    markets_with_volume: rows.filter((market) => market.volume > 0).length,
    active_spread_markets: activeSpreadMarkets.length,
    total_volume: rows.reduce((sum, market) => sum + market.volume, 0),
    total_volume_24h: rows.reduce((sum, market) => sum + market.volume_24h, 0),
    total_liquidity: rows.reduce((sum, market) => sum + market.liquidity, 0),
    top_by_volume: [...rows].sort((a, b) => b.volume - a.volume).slice(0, 20),
    top_by_liquidity: [...rows].filter((market) => market.liquidity > 0).sort((a, b) => b.liquidity - a.liquidity).slice(0, 20),
    tightest_spreads: activeSpreadMarkets
      .map((market) => ({ ...market, spread: market.yes_ask - market.yes_bid }))
      .filter((market) => market.volume > 0 || market.open_interest > 0)
      .sort((a, b) => a.spread - b.spread)
      .slice(0, 20),
  };
}

function normalizeMarket(market) {
  return {
    ticker: market.ticker,
    event_ticker: market.event_ticker ?? null,
    title: market.title,
    yes_bid: marketPrice(market.yes_bid ?? market.yes_bid_dollars),
    yes_ask: marketPrice(market.yes_ask ?? market.yes_ask_dollars),
    no_bid: marketPrice(market.no_bid ?? market.no_bid_dollars),
    no_ask: marketPrice(market.no_ask ?? market.no_ask_dollars),
    last_price: marketPrice(market.last_price ?? market.last_price_dollars),
    volume: numberFromMarketField(market.volume ?? market.volume_fp),
    volume_24h: numberFromMarketField(market.volume_24h ?? market.volume_24h_fp),
    liquidity: numberFromMarketField(market.liquidity ?? market.liquidity_dollars),
    open_interest: numberFromMarketField(market.open_interest ?? market.open_interest_fp),
    close_time: market.close_time ?? null,
  };
}

function numberFromMarketField(value) {
  if (value == null || value === "") return 0;
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function marketPrice(value) {
  if (value == null || value === "") return null;
  const number = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(number)) return null;
  return number > 1 ? number / 100 : number;
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
  node tools/kalshi.mjs scan [--status open] [--limit 1000] [--series <series_ticker>]

Examples:
  node tools/kalshi.mjs status
  node tools/kalshi.mjs markets --status open --limit 100
  node tools/kalshi.mjs markets --series KXBTC --status open
  node tools/kalshi.mjs scan --status open --limit 1000
  node tools/kalshi.mjs orderbook --ticker <market_ticker> --depth 50
`);
}
