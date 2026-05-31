#!/usr/bin/env node

import {
  AlphaVantageClient,
  COMMODITIES,
  ECONOMIC_INDICATORS,
  getCommoditiesSnapshot,
  getCommodity,
  getDailyBars,
  getEarningsCalendar,
  getEconomicIndicator,
  getMarketStatus,
  getNewsSentiment,
  getQuote,
  getTopGainersLosers,
  searchSymbol,
} from "../adapters/alphavantage/index.mjs";

const client = new AlphaVantageClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "gainers-losers":
      print(await getTopGainersLosers(client));
      break;
    case "market-status":
      print(await getMarketStatus(client));
      break;
    case "news":
      print(await getNewsSentiment(client, parseOptions(rest)));
      break;
    case "earnings-calendar":
      print(await getEarningsCalendar(client, parseOptions(rest)));
      break;
    case "quote":
      print(await getQuote(client, req(rest[0], "symbol")));
      break;
    case "search":
      print(await searchSymbol(client, req(rest[0], "keywords")));
      break;
    case "bars":
      print(await getDailyBars(client, req(rest[0], "symbol"), parseOptions(rest.slice(1))));
      break;
    case "commodity":
      print(await getCommodity(client, req(rest[0], "commodity"), parseOptions(rest.slice(1))));
      break;
    case "commodities":
      print(await getCommoditiesSnapshot(client));
      break;
    case "economic":
      print(await getEconomicIndicator(client, req(rest[0], "indicator"), parseOptions(rest.slice(1))));
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
  console.log(`Trade Ops Alpha Vantage Tool

⚠ Free tier: 25 requests/day. Use sparingly.

Usage:
  node tools/alphavantage.mjs gainers-losers
  node tools/alphavantage.mjs market-status
  node tools/alphavantage.mjs news [--tickers NVDA,PLTR] [--topics technology] [--limit 20]
  node tools/alphavantage.mjs earnings-calendar [--symbol NVDA] [--horizon 3month|6month]
  node tools/alphavantage.mjs quote <symbol>
  node tools/alphavantage.mjs search <keywords>
  node tools/alphavantage.mjs bars <symbol> [--output-size compact|full]
  node tools/alphavantage.mjs commodity <name> [--interval monthly|weekly|daily]
  node tools/alphavantage.mjs commodities
  node tools/alphavantage.mjs economic <indicator> [--interval monthly] [--maturity 10year]

Commodities: ${COMMODITIES.join(", ")}
Indicators:  ${ECONOMIC_INDICATORS.join(", ")}

News topics: blockchain, earnings, ipo, mergers, financial_markets, economy_macro,
             economy_fiscal, economy_monetary, technology, life_sciences, energy_transportation

Examples:
  node tools/alphavantage.mjs news --tickers PLTR --limit 10
  node tools/alphavantage.mjs commodity wheat --interval monthly
  node tools/alphavantage.mjs commodity copper --interval weekly
  node tools/alphavantage.mjs economic unemployment
  node tools/alphavantage.mjs economic treasury_yield --maturity 10year
  node tools/alphavantage.mjs earnings-calendar --horizon 3month
  node tools/alphavantage.mjs gainers-losers
`);
}
