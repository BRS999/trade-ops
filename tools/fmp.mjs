#!/usr/bin/env node

import { FmpClient, getAnalystSummary, getPriceTargetConsensus, getAnalystEstimates, getEarningsCalendar } from "../adapters/fmp/index.mjs";

const client = new FmpClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "summary":
      print(await getAnalystSummary(client, requireArg(rest[0], "symbol")));
      break;
    case "targets":
      print(await getPriceTargetConsensus(client, requireArg(rest[0], "symbol")));
      break;
    case "estimates":
      print(await getAnalystEstimates(client, requireArg(rest[0], "symbol"), { limit: 4 }));
      break;
    case "earnings":
      print(await runEarnings(rest));
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

async function runEarnings(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--symbol") { options.symbol = requireArg(args[++i], "symbol"); continue; }
    if (args[i] === "--from")   { options.from = requireArg(args[++i], "from"); continue; }
    if (args[i] === "--to")     { options.to = requireArg(args[++i], "to"); continue; }
    if (args[i] === "--limit")  { options.limit = Number(requireArg(args[++i], "limit")); continue; }
    throw new Error(`Unknown option: ${args[i]}`);
  }
  return getEarningsCalendar(client, options);
}

function requireArg(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops FMP Tool

Usage:
  node tools/fmp.mjs summary <symbol>
  node tools/fmp.mjs targets <symbol>
  node tools/fmp.mjs estimates <symbol>
  node tools/fmp.mjs earnings [--symbol AAPL] [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--limit 10]
  node tools/fmp.mjs calendar [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--country US] [--high]

Examples:
  node tools/fmp.mjs summary AAPL
  node tools/fmp.mjs targets NVDA
  node tools/fmp.mjs earnings --symbol META --limit 4
  node tools/fmp.mjs earnings --from 2026-04-01 --to 2026-04-30
  node tools/fmp.mjs calendar
  node tools/fmp.mjs calendar --high
  node tools/fmp.mjs calendar --from 2026-04-09 --to 2026-04-30
`);
}
