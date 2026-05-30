#!/usr/bin/env node

import {
  PolymarketClient,
  getConsensusStudy,
  getActiveMarketScan,
  getEvent,
  getLeaderboard,
  getMarket,
  getMarketPositions,
  getOrderBook,
  getPublicProfile,
  getWalletActivity,
  getWalletPositions,
  getWalletSummary,
  getWalletTrades,
  listEvents,
  listMarkets,
} from "../adapters/polymarket/index.mjs";

const client = new PolymarketClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "markets":
      print(await listMarkets(client, parseOptions(rest)));
      break;
    case "events":
      print(await listEvents(client, parseOptions(rest)));
      break;
    case "market":
      print(await getMarket(client, req(rest[0], "market id")));
      break;
    case "event":
      print(await getEvent(client, req(rest[0], "event id")));
      break;
    case "book":
      print(await getOrderBook(client, req(rest[0], "token id")));
      break;
    case "profile":
    case "wallet-profile":
      print(await getPublicProfile(client, req(rest[0], "wallet")));
      break;
    case "leaderboard":
      print(await getLeaderboard(client, parseOptions(rest)));
      break;
    case "btc-consensus-study":
      print(await getConsensusStudy(client, { ...parseOptions(rest), query: "bitcoin", match: "bitcoin,btc" }));
      break;
    case "consensus-study":
      print(await getConsensusStudy(client, parseOptions(rest)));
      break;
    case "wallet-activity":
      print(await getWalletActivity(client, req(rest[0], "wallet"), parseOptions(rest.slice(1))));
      break;
    case "wallet-trades":
      print(await getWalletTrades(client, req(rest[0], "wallet"), parseOptions(rest.slice(1))));
      break;
    case "wallet-positions":
      print(await getWalletPositions(client, req(rest[0], "wallet"), parseOptions(rest.slice(1))));
      break;
    case "wallet-summary":
      print(await getWalletSummary(client, req(rest[0], "wallet"), parseOptions(rest.slice(1))));
      break;
    case "market-positions":
      print(await getMarketPositions(client, req(rest[0], "condition id"), parseOptions(rest.slice(1))));
      break;
    case "scan":
      print(await getActiveMarketScan(client, parseOptions(rest)));
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
    if (!arg.startsWith("--")) throw new Error(`Unknown positional argument: ${arg}`);
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

function parseValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  const numeric = Number(value);
  return Number.isFinite(numeric) && String(numeric) === value ? numeric : value;
}

function req(value, name) {
  if (!value) throw new Error(`<${name}> is required`);
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops — Polymarket

Usage: npm run polymarket -- <command> [options]

Commands:
  markets [--limit 100] [--active true] [--order volume24hr]
  events [--limit 100] [--active true]
  market <id>
  event <id>
  book <clobTokenId>
  leaderboard [--category OVERALL] [--period MONTH] [--order-by PNL] [--limit 25]
  consensus-study [--query bitcoin] [--match bitcoin,btc] [--market-limit 50] [--max-pages 25] [--horizons 168,24,1,0]
  btc-consensus-study [--market-limit 50] [--max-pages 25] [--horizons 168,24,1,0]
  wallet-profile <wallet>
  wallet-activity <wallet> [--limit 100] [--type TRADE] [--start unix] [--end unix]
  wallet-trades <wallet> [--limit 100] [--side BUY|SELL]
  wallet-positions <wallet> [--limit 100] [--sort-by CURRENT]
  wallet-summary <wallet> [--days 90] [--limit 250]
  market-positions <conditionId> [--status OPEN] [--limit 50]
  scan [--limit 100] [--sort volume24hr]

Examples:
  npm run polymarket -- scan --limit 100
  npm run polymarket -- markets --active true --closed false --limit 25 --order volume24hr
  npm run polymarket -- leaderboard --category CRYPTO --period MONTH --limit 25
  npm run polymarket -- btc-consensus-study --market-limit 50 --horizons 168,24,1,0
  npm run polymarket -- wallet-summary 0x0000000000000000000000000000000000000000 --days 90
`);
}
