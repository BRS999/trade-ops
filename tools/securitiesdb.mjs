#!/usr/bin/env node

import {
  SecuritiesDbClient,
  getInsiderActivity,
  getInsiderTransactions,
  getInstitutionalFlow,
  getSmartMoneySnapshot,
} from "../adapters/securitiesdb/index.mjs";

const client = new SecuritiesDbClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "snapshot":
      print(await getSmartMoneySnapshot(client, req(rest[0], "symbol")));
      break;
    case "insiders":
      print(await getInsiderTransactions(client, req(rest[0], "symbol")));
      break;
    case "institutional":
      print(await getInstitutionalFlow(client, req(rest[0], "symbol")));
      break;
    case "raw":
      print(await getInsiderActivity(client, req(rest[0], "symbol")));
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

function req(value, name) {
  if (!value) throw new Error(`<${name}> is required`);
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops SecuritiesDB Tool

Usage:
  node tools/securitiesdb.mjs snapshot <symbol>       # insider + smart money in one call
  node tools/securitiesdb.mjs insiders <symbol>       # Form 4 insider transactions
  node tools/securitiesdb.mjs institutional <symbol>  # 13F smart-money flow summary
  node tools/securitiesdb.mjs raw <symbol>            # full raw response

Examples:
  node tools/securitiesdb.mjs snapshot PLTR
  node tools/securitiesdb.mjs institutional AAPL
  node tools/securitiesdb.mjs insiders NVDA

No API key required.
`);
}
