#!/usr/bin/env node

import {
  CoinGeckoClient,
  getCategories,
  getCoin,
  getCorporateTreasury,
  getCryptoMarketSnapshot,
  getEntities,
  getEntityHoldingChart,
  getEntityTransactions,
  getEntityTreasury,
  getExchangeRates,
  getGlobalDeFi,
  getGlobalMarket,
  getGovernmentTreasury,
  getKeyUsage,
  getMarketChart,
  getMarkets,
  getOhlc,
  getPrice,
  getSovereignBtcSnapshot,
  getTrending,
  ping,
  search,
} from "../adapters/coingecko/index.mjs";

const client = new CoinGeckoClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    // ── Core ────────────────────────────────────────────────────────────
    case "ping":
      print(await ping(client));
      break;
    case "key":
      print(await getKeyUsage(client));
      break;
    case "global":
      print(await getGlobalMarket(client));
      break;
    case "defi":
      print(await getGlobalDeFi(client));
      break;
    case "snapshot":
      print(await getCryptoMarketSnapshot(client));
      break;
    case "trending":
      print(await getTrending(client));
      break;
    case "exchange-rates":
      print(await getExchangeRates(client));
      break;
    case "categories":
      print(await getCategories(client, parseOptions(rest)));
      break;

    // ── Coins ────────────────────────────────────────────────────────────
    case "search":
      print(await search(client, req(rest[0], "query")));
      break;
    case "price":
      print(await runPrice(rest));
      break;
    case "markets":
      print(await getMarkets(client, parseOptions(rest)));
      break;
    case "coin":
      print(await getCoin(client, req(rest[0], "coinId")));
      break;
    case "ohlc":
      print(await runOhlc(rest));
      break;
    case "chart":
      print(await runChart(rest));
      break;

    // ── Treasury ─────────────────────────────────────────────────────────
    case "entities":
      print(await getEntities(client, parseOptions(rest)));
      break;
    case "treasury":
      print(await getEntityTreasury(client, req(rest[0], "entityId"), {
        holdingAmountChange: "7d,30d,1y",
        holdingChangePercentage: "7d,30d,1y",
      }));
      break;
    case "treasury-chart":
      print(await getEntityHoldingChart(client, req(rest[0], "entityId"), rest[1] ?? "bitcoin", rest[2] ?? 365));
      break;
    case "treasury-txns":
      print(await getEntityTransactions(client, req(rest[0], "entityId"), parseOptions(rest.slice(1))));
      break;
    case "corporate-btc":
      print(await getCorporateTreasury(client, rest[0] ?? "bitcoin"));
      break;
    case "sovereign-btc":
      print(await getSovereignBtcSnapshot(client));
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

async function runPrice(args) {
  const ids = req(args[0], "coinIds").split(",").map((s) => s.trim());
  const opts = parseOptions(args.slice(1));
  return getPrice(client, ids, {
    vsCurrencies: opts.currency ?? "usd",
    marketCap: opts.marketCap ?? opts["market-cap"],
    vol24h: opts.vol,
    change24h: opts.change,
  });
}

async function runOhlc(args) {
  const coinId = req(args[0], "coinId");
  const opts = parseOptions(args.slice(1));
  return getOhlc(client, coinId, {
    days: opts.days ?? 30,
    vsCurrency: opts.currency ?? "usd",
  });
}

async function runChart(args) {
  const coinId = req(args[0], "coinId");
  const opts = parseOptions(args.slice(1));
  return getMarketChart(client, coinId, {
    days: opts.days ?? 30,
    vsCurrency: opts.currency ?? "usd",
    interval: opts.interval,
  });
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
  console.log(`Trade Ops CoinGecko Tool

Usage — Market:
  node tools/coingecko.mjs ping
  node tools/coingecko.mjs global
  node tools/coingecko.mjs defi
  node tools/coingecko.mjs snapshot
  node tools/coingecko.mjs trending
  node tools/coingecko.mjs exchange-rates
  node tools/coingecko.mjs categories [--order market_cap_change_24h_desc]

Usage — Coins:
  node tools/coingecko.mjs search <query>
  node tools/coingecko.mjs price <id1,id2,...> [--change] [--vol]
  node tools/coingecko.mjs markets [--ids id1,id2] [--category defi] [--per-page 50]
  node tools/coingecko.mjs coin <coinId>
  node tools/coingecko.mjs ohlc <coinId> [--days 30]
  node tools/coingecko.mjs chart <coinId> [--days 7] [--interval daily]

Usage — Treasury:
  node tools/coingecko.mjs entities [--entity-type company|government]
  node tools/coingecko.mjs treasury <entityId>
  node tools/coingecko.mjs treasury-chart <entityId> [coinId] [days]
  node tools/coingecko.mjs treasury-txns <entityId>
  node tools/coingecko.mjs corporate-btc [bitcoin|ethereum]
  node tools/coingecko.mjs sovereign-btc

Treasury entity IDs: strategy, mara-holdings, metaplanet, united-states,
  china, north-korea, united-kingdom, bhutan, el-salvador, germany

Examples:
  node tools/coingecko.mjs sovereign-btc
  node tools/coingecko.mjs treasury strategy
  node tools/coingecko.mjs treasury united-states
  node tools/coingecko.mjs treasury-txns strategy
  node tools/coingecko.mjs corporate-btc bitcoin
  node tools/coingecko.mjs categories --order market_cap_change_24h_desc
`);
}
