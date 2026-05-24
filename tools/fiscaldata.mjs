#!/usr/bin/env node

import {
  FiscalDataClient,
  getDailyTreasuryStatement,
  getDebtToPenny,
  getFiscalSnapshot,
  getTreasurySecurities,
} from "../adapters/fiscaldata/index.mjs";

const client = new FiscalDataClient();
const [, , command, ...rest] = process.argv;

try {
  switch (command) {
    case "debt":
      print(await getDebtToPenny(client, parseOptions(rest)));
      break;
    case "securities-sales":
      print(await getTreasurySecurities(client, parseOptions(rest)));
      break;
    case "dts":
      print(await getDailyTreasuryStatement(client, parseOptions(rest)));
      break;
    case "snapshot":
      print(await getFiscalSnapshot(client, parseOptions(rest)));
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
    if (arg === "--limit") options.limit = Number(req(args[++index], "limit"));
    else if (arg === "--fields") options.fields = req(args[++index], "fields");
    else if (arg === "--filter") options.filter = req(args[++index], "filter");
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function req(value, name) {
  if (!value) throw new Error(`<${name}> is required`);
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Trade Ops — Treasury FiscalData

Usage: npm run fiscaldata -- <command> [args]

Commands:
  debt [--limit 10]
  securities-sales [--limit 10] [--fields a,b] [--filter expression]
  dts [--limit 10] [--fields a,b] [--filter expression]
  snapshot [--limit 5]
`);
}
