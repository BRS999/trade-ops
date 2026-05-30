#!/usr/bin/env node

import {
  FinnhubClient,
  getBasicFinancials,
  getCompanyNews,
  getCongressionalTrading,
  getEarnings,
  getEarningsCalendar,
  getEconomicCalendar,
  getEquitySnapshot,
  getInsiderSentiment,
  getInsiderTransactions,
  getMarketNews,
  getNewsSentiment,
  getPeers,
  getPriceTarget,
  getProfile,
  getQuote,
  getRecommendationTrends,
  getSocialSentiment,
  getUpgradeDowngrade,
} from "../adapters/finnhub/index.mjs";

const client = new FinnhubClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "quote":
      print(await getQuote(client, req(rest[0], "symbol")));
      break;
    case "profile":
      print(await getProfile(client, req(rest[0], "symbol")));
      break;
    case "financials":
      print(await getBasicFinancials(client, req(rest[0], "symbol"), rest[1] ?? "all"));
      break;
    case "peers":
      print(await getPeers(client, req(rest[0], "symbol")));
      break;
    case "snapshot":
      print(await getEquitySnapshot(client, req(rest[0], "symbol")));
      break;
    case "insider-transactions":
      print(await getInsiderTransactions(client, req(rest[0], "symbol"), parseOptions(rest.slice(1))));
      break;
    case "insider-sentiment":
      print(await getInsiderSentiment(client, req(rest[0], "symbol"), req(rest[1], "from"), req(rest[2], "to")));
      break;
    case "congressional":
      print(await getCongressionalTrading(client, req(rest[0], "symbol"), req(rest[1], "from"), req(rest[2], "to")));
      break;
    case "social-sentiment":
      print(await getSocialSentiment(client, req(rest[0], "symbol"), parseOptions(rest.slice(1))));
      break;
    case "news":
      print(await getCompanyNews(client, req(rest[0], "symbol"), req(rest[1], "from"), req(rest[2], "to")));
      break;
    case "news-sentiment":
      print(await getNewsSentiment(client, req(rest[0], "symbol")));
      break;
    case "market-news":
      print(await getMarketNews(client, rest[0] ?? "general"));
      break;
    case "earnings-calendar":
      print(await getEarningsCalendar(client, parseOptions(rest)));
      break;
    case "earnings":
      print(await getEarnings(client, req(rest[0], "symbol"), parseOptions(rest.slice(1))));
      break;
    case "upgrades":
      print(await getUpgradeDowngrade(client, parseOptions(rest)));
      break;
    case "price-target":
      print(await getPriceTarget(client, req(rest[0], "symbol")));
      break;
    case "recommendations":
      print(await getRecommendationTrends(client, req(rest[0], "symbol")));
      break;
    case "economic-calendar":
      print(await getEconomicCalendar(client, parseOptions(rest)));
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

function req(value, name) {
  if (!value) throw new Error(`<${name}> is required`);
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops Finnhub Tool

Usage:
  node tools/finnhub.mjs quote <symbol>
  node tools/finnhub.mjs profile <symbol>
  node tools/finnhub.mjs financials <symbol> [all|price|valuation|margin|growth|...]
  node tools/finnhub.mjs peers <symbol>
  node tools/finnhub.mjs snapshot <symbol>

  node tools/finnhub.mjs insider-transactions <symbol> [--from YYYY-MM-DD] [--to YYYY-MM-DD]
  node tools/finnhub.mjs insider-sentiment <symbol> <from> <to>
  node tools/finnhub.mjs congressional <symbol> <from> <to>
  node tools/finnhub.mjs social-sentiment <symbol> [--from YYYY-MM-DD] [--to YYYY-MM-DD]

  node tools/finnhub.mjs news <symbol> <from> <to>
  node tools/finnhub.mjs news-sentiment <symbol>
  node tools/finnhub.mjs market-news [general|forex|crypto|merger]

  node tools/finnhub.mjs earnings-calendar [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--symbol PLTR]
  node tools/finnhub.mjs earnings <symbol> [--limit 4]
  node tools/finnhub.mjs upgrades [--symbol PLTR] [--from YYYY-MM-DD] [--to YYYY-MM-DD]
  node tools/finnhub.mjs price-target <symbol>
  node tools/finnhub.mjs recommendations <symbol>
  node tools/finnhub.mjs economic-calendar [--from YYYY-MM-DD] [--to YYYY-MM-DD]

Examples:
  node tools/finnhub.mjs snapshot PLTR
  node tools/finnhub.mjs insider-transactions PLTR --from 2026-01-01
  node tools/finnhub.mjs congressional PLTR 2026-01-01 2026-05-30
  node tools/finnhub.mjs earnings-calendar --from 2026-05-30 --to 2026-06-06
  node tools/finnhub.mjs news PLTR 2026-05-01 2026-05-30
`);
}
