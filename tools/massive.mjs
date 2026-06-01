#!/usr/bin/env node

import {
  MassiveClient,
  getBars,
  getFinancials,
  getOptionContracts,
  getOptionChainSnapshot,
  getOptionTrades,
  getOptionBars,
  scanUnusualOptions,
  getFuturesContracts,
  getFuturesProducts,
  getFuturesSchedule,
  getFuturesSnapshots,
  getFuturesBars,
  getFuturesTrades,
  getFrontContract,
  getPrevDay,
  getSnapshot,
  getSnapshots,
  getTickerDetails,
} from "../adapters/massive/index.mjs";

let client;

try {
  client = new MassiveClient();
} catch (error) {
  if (process.argv[2] !== "help" && process.argv[2] !== undefined) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "snapshot":
      ensureClient();
      print(await getSnapshot(client, requireArg(rest[0], "ticker")));
      break;
    case "prev-day":
      ensureClient();
      print(await getPrevDay(client, requireArg(rest[0], "ticker")));
      break;
    case "ticker-details":
      ensureClient();
      print(await getTickerDetails(client, requireArg(rest[0], "ticker")));
      break;
    case "financials":
      ensureClient();
      print(await runFinancials(rest));
      break;
    case "bars":
      ensureClient();
      print(await runBars(rest));
      break;
    case "options-contracts":
      ensureClient();
      print(await runOptionsContracts(rest));
      break;
    case "options-chain":
      ensureClient();
      print(await runOptionsChain(rest));
      break;
    case "options-trades":
      ensureClient();
      print(await runOptionsTrades(rest));
      break;
    case "options-bars":
      ensureClient();
      print(await runOptionsBars(rest));
      break;
    case "options-unusual":
      ensureClient();
      print(await runOptionsUnusual(rest));
      break;
    case "futures-contracts":
      ensureClient();
      print(await runFuturesContracts(rest));
      break;
    case "futures-products":
      ensureClient();
      print(await runFuturesProducts(rest));
      break;
    case "futures-snapshot":
      ensureClient();
      print(await runFuturesSnapshot(rest));
      break;
    case "futures-bars":
      ensureClient();
      print(await runFuturesBars(rest));
      break;
    case "futures-trades":
      ensureClient();
      print(await runFuturesTrades(rest));
      break;
    case "futures-front":
      ensureClient();
      print(await runFuturesFront(rest));
      break;
    case "futures-schedule":
      ensureClient();
      print(await runFuturesSchedule(rest));
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

async function runFinancials(args) {
  const ticker = requireArg(args[0], "ticker");
  const options = {};

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--timeframe") {
      options.timeframe = requireArg(args[index + 1], "timeframe");
      index += 1;
      continue;
    }
    if (arg === "--limit") {
      const limit = Number(requireArg(args[index + 1], "limit"));
      if (!Number.isFinite(limit) || limit <= 0) {
        throw new Error("limit must be a positive number");
      }
      options.limit = limit;
      index += 1;
      continue;
    }
    throw new Error(`Unknown financials option: ${arg}`);
  }

  return getFinancials(client, ticker, options);
}

async function runBars(args) {
  const ticker = requireArg(args[0], "ticker");
  const options = {};

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--from") {
      options.from = requireArg(args[index + 1], "from");
      index += 1;
      continue;
    }
    if (arg === "--to") {
      options.to = requireArg(args[index + 1], "to");
      index += 1;
      continue;
    }
    if (arg === "--timespan") {
      options.timespan = requireArg(args[index + 1], "timespan");
      index += 1;
      continue;
    }
    if (arg === "--multiplier") {
      const multiplier = Number(requireArg(args[index + 1], "multiplier"));
      if (!Number.isFinite(multiplier) || multiplier <= 0) {
        throw new Error("multiplier must be a positive number");
      }
      options.multiplier = multiplier;
      index += 1;
      continue;
    }
    if (arg === "--limit") {
      const limit = Number(requireArg(args[index + 1], "limit"));
      if (!Number.isFinite(limit) || limit <= 0) {
        throw new Error("limit must be a positive number");
      }
      options.limit = limit;
      index += 1;
      continue;
    }
    throw new Error(`Unknown bars option: ${arg}`);
  }

  return getBars(client, ticker, options);
}

// ── Options runners ───────────────────────────────────────────────────────────

async function runOptionsContracts(args) {
  const underlying = requireArg(args[0], "underlying");
  const contractType = flag(args, "--type");
  const asOf = flag(args, "--as-of");
  const limit = Number(flag(args, "--limit", "100"));
  return getOptionContracts(client, underlying, contractType || undefined, asOf || undefined, limit);
}

async function runOptionsChain(args) {
  const underlying = requireArg(args[0], "underlying");
  return getOptionChainSnapshot(client, underlying);
}

async function runOptionsTrades(args) {
  const ticker = requireArg(args[0], "options-ticker");
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  const limit = Number(flag(args, "--limit", "100"));
  const opts = { limit };
  if (from) opts.timestamp_gte = from;
  if (to) opts.timestamp_lte = to;
  return getOptionTrades(client, ticker, opts);
}

async function runOptionsBars(args) {
  const ticker = requireArg(args[0], "options-ticker");
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  const timespan = flag(args, "--timespan", "day");
  const multiplier = Number(flag(args, "--multiplier", "1"));
  const limit = Number(flag(args, "--limit", "120"));
  return getOptionBars(client, ticker, { from, to, timespan, multiplier, limit });
}

async function runOptionsUnusual(args) {
  const underlying = requireArg(args[0], "underlying");
  const minVolume = Number(flag(args, "--min-volume", "100"));
  const oiMultiplier = Number(flag(args, "--oi-multiplier", "2"));
  return scanUnusualOptions(client, underlying, { minVolume, oiMultiplier });
}

// ── Futures runners ───────────────────────────────────────────────────────────

async function runFuturesContracts(args) {
  const productCode = flag(args, "--product") || flag(args, "--product-code");
  const asOf = flag(args, "--as-of");
  const limit = Number(flag(args, "--limit", "100"));
  const includeInactive = args.includes("--all");
  return getFuturesContracts(client, {
    product_code: productCode,
    active: !includeInactive,
    as_of: asOf || undefined,
    limit,
  });
}

async function runFuturesProducts(args) {
  const exchange = flag(args, "--exchange");
  const sector = flag(args, "--sector");
  const limit = Number(flag(args, "--limit", "100"));
  return getFuturesProducts(client, { exchange, sector, limit });
}

async function runFuturesSnapshot(args) {
  const ticker = flag(args, "--ticker");
  const productCode = flag(args, "--product") || flag(args, "--product-code");
  const sort = flag(args, "--sort");
  const limit = Number(flag(args, "--limit", "100"));
  return getFuturesSnapshots(client, {
    ticker: ticker || undefined,
    product_code: productCode || undefined,
    sort: sort || undefined,
    limit,
  });
}

async function runFuturesBars(args) {
  const ticker = requireArg(args[0], "ticker");
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  const timespan = flag(args, "--timespan", "day");
  const multiplier = Number(flag(args, "--multiplier", "1"));
  const limit = Number(flag(args, "--limit", "5000"));
  return getFuturesBars(client, ticker, { from, to, timespan, multiplier, limit });
}

async function runFuturesTrades(args) {
  const ticker = requireArg(args[0], "ticker");
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  const limit = Number(flag(args, "--limit", "100"));
  const opts = { limit };
  if (from) opts.timestamp_gte = from;
  if (to) opts.timestamp_lte = to;
  return getFuturesTrades(client, ticker, opts);
}

async function runFuturesFront(args) {
  const productCode = requireArg(args[0], "product-code");
  return getFrontContract(client, productCode);
}

async function runFuturesSchedule(args) {
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  const productCode = flag(args, "--product") || flag(args, "--product-code");
  const limit = Number(flag(args, "--limit", "100"));
  return getFuturesSchedule(client, { from, to, product_code: productCode || undefined, limit });
}

function ensureClient() {
  if (!client) {
    throw new Error("Massive client is unavailable");
  }
}

function requireArg(value, name) {
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function flag(args, name, defaultVal) {
  const idx = args.indexOf(name);
  if (idx === -1) return defaultVal;
  return args[idx + 1];
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops Massive Tool

Requires:
  MASSIVE_API_KEY in the environment

Usage:
  node tools/massive.mjs snapshot <ticker>
  node tools/massive.mjs prev-day <ticker>
  node tools/massive.mjs ticker-details <ticker>
  node tools/massive.mjs financials <ticker> [--timeframe quarterly] [--limit 4]
  node tools/massive.mjs bars <ticker> --from YYYY-MM-DD --to YYYY-MM-DD [--timespan day] [--multiplier 1] [--limit 120]

Options (requires paid Massive plan — Starter $29/mo+):
  node tools/massive.mjs options-contracts <underlying> [--type call|put] [--as-of YYYY-MM-DD] [--limit 100]
  node tools/massive.mjs options-chain <underlying>
  node tools/massive.mjs options-trades <options-ticker> [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--limit 100]
  node tools/massive.mjs options-bars <options-ticker> --from YYYY-MM-DD --to YYYY-MM-DD [--timespan day] [--multiplier 1] [--limit 120]
  node tools/massive.mjs options-unusual <underlying> [--min-volume 100] [--oi-multiplier 2]

Futures (requires paid Massive plan — Starter $29/mo+):
  node tools/massive.mjs futures-contracts [--product ES|GC|CL|...] [--all] [--limit 100]
  node tools/massive.mjs futures-products [--exchange CME|NYMEX|...] [--sector Energy|Metals|...]
  node tools/massive.mjs futures-front <product-code>
  node tools/massive.mjs futures-snapshot --ticker ESZ24 [--sort field] [--limit 100]
  node tools/massive.mjs futures-snapshot --product ES
  node tools/massive.mjs futures-bars <ticker> --from YYYY-MM-DD --to YYYY-MM-DD [--timespan day] [--multiplier 1]
  node tools/massive.mjs futures-trades <ticker> [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--limit 100]
  node tools/massive.mjs futures-schedule --from YYYY-MM-DD --to YYYY-MM-DD [--product ES|GC|...]
`);
}
