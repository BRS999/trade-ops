#!/usr/bin/env node

import { MassiveClient, getBars, getFinancials, getPrevDay, getSnapshot, getTickerDetails } from "../adapters/massive/index.mjs";

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
`);
}
